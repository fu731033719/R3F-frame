import { useEffect, useMemo, useRef, useState } from 'react';

interface UseEngagementTimeOptions {
	/** 历史已记录的方案有效交互时间 */
	preCacheTimeoutMs?: number;
	/** 无鼠标/键盘/触摸事件判为空闲的阈值 */
	idleTimeoutMs?: number;
	/** UI刷新/上报的节流间隔 */
	tickIntervalMs?: number;
	/** 指定监听的 frame 窗口对象（如 iframe.contentWindow），默认当前 window */
	targetWindow?: (Window & typeof globalThis) | null;
	/** 进入有效统计回调 */
	onStartEngage?: () => void;
	/** 离开有效统计回调（本次会话时长） */
	onStopEngage?: (sessionMs: number) => void;
	/** 每个tick回调（例如用于埋点/展示） */
	onTick?: (totalMs: number) => void;
}

interface UseEngagementTimeReturn {
	/** 累计有效使用时长（毫秒） */
	totalMs: number;
	/** 当前是否处于有效统计中 */
	isEngaging: boolean;
	/** 重置累计 */
	reset: () => void;
}

/**
 * 统一的存在判断，避免 SSR/测试环境报错
 */
function getSafeWindow(targetWindow?: (Window & typeof globalThis) | null) {
	if (typeof window === 'undefined') return undefined;
	return targetWindow ?? window;
}

export function useEngagementTime(options?: UseEngagementTimeOptions): UseEngagementTimeReturn {
	const {
		preCacheTimeoutMs = 0,
		idleTimeoutMs = 5000,
		tickIntervalMs = 1000,
		targetWindow,
		onStartEngage,
		onStopEngage,
		onTick,
	} = options || {};

	// 绑定目标 frame（iframe 或当前页面）
	const win = getSafeWindow(targetWindow);
	const doc = win?.document ?? (typeof document !== 'undefined' ? document : undefined);

	// 始终保持对最新回调的引用，避免闭包拿到过期值
	const onStartEngageRef = useRef<UseEngagementTimeOptions['onStartEngage']>(undefined);
	const onStopEngageRef = useRef<UseEngagementTimeOptions['onStopEngage']>(undefined);
	const onTickRef = useRef<UseEngagementTimeOptions['onTick']>(undefined);
	useEffect(() => {
		onStartEngageRef.current = onStartEngage;
	}, [onStartEngage]);
	useEffect(() => {
		onStopEngageRef.current = onStopEngage;
	}, [onStopEngage]);
	useEffect(() => {
		onTickRef.current = onTick;
	}, [onTick]);

	// 标签页激活状态（可见且聚焦）
	const [isTabActive, setIsTabActive] = useState<boolean>(() => {
		const isVisible = doc ? doc.visibilityState === 'visible' : true;
		const hasFocus = win?.document ? win.document.hasFocus?.() ?? true : true;
		return isVisible && hasFocus;
	});

	// 鼠标是否在页面内
	const [isMouseInWindow, setIsMouseInWindow] = useState<boolean>(true);

	// 用户空闲状态（鼠标/键盘/触摸）
	const [isUserIdle, setIsUserIdle] = useState<boolean>(true);
	const idleTimerRef = useRef<number | null>(null);
	const rafLockRef = useRef<boolean>(false);
	const usingIdleDetectorRef = useRef<boolean>(false);

	// 计时
	const [totalMs, setTotalMs] = useState<number>(preCacheTimeoutMs);
	const accumulatedMsRef = useRef<number>(preCacheTimeoutMs);
	const sessionStartAtRef = useRef<number | null>(null);
	const tickTimerRef = useRef<number | null>(null);

	// 统一清理定时器
	const clearIdleTimer = () => {
		if (idleTimerRef.current !== null) {
			(win ?? window)?.clearTimeout?.(idleTimerRef.current as any);
			idleTimerRef.current = null;
		}
	};
	const clearTickTimer = () => {
		if (tickTimerRef.current !== null) {
			(win ?? window)?.clearInterval?.(tickTimerRef.current as any);
			tickTimerRef.current = null;
		}
	};

	// 重置空闲计时（有用户交互行为时调用）
	const bumpUserActive = () => {
		if (usingIdleDetectorRef.current) return; // 使用 IdleDetector 时无需手动计时
		setIsUserIdle(false);
		clearIdleTimer();
		idleTimerRef.current = (win ?? window)?.setTimeout?.(() => {
			setIsUserIdle(true);
		}, idleTimeoutMs) as unknown as number;
	};

	// 事件：标签页可见性与焦点
	useEffect(() => {
		if (!win || !doc) {
			return () => {
				//
			};
		}
		const handleVisibility = () => {
			const visible = doc.visibilityState === 'visible';
			const hasFocus = doc.hasFocus?.() ?? true;
			setIsTabActive(visible && hasFocus);
		};
		const handleFocus = () => setIsTabActive(doc.visibilityState === 'visible' && true);
		const handleBlur = () => setIsTabActive(false);

		doc.addEventListener('visibilitychange', handleVisibility as any);
		win.addEventListener('focus', handleFocus as any);
		win.addEventListener('blur', handleBlur as any);

		return () => {
			doc.removeEventListener('visibilitychange', handleVisibility as any);
			win.removeEventListener('focus', handleFocus as any);
			win.removeEventListener('blur', handleBlur as any);
		};
	}, []);

	// 事件：鼠标是否在窗口内
	useEffect(() => {
		if (!win || !doc) {
			return () => {
				//
			};
		}
		const onEnter = () => setIsMouseInWindow(true);
		const onLeave = () => setIsMouseInWindow(false);

		// window 的 mouseenter/leave 支持不一致，补充 document 级别
		win.addEventListener('mouseenter', onEnter as any, { passive: true } as any);
		win.addEventListener('mouseleave', onLeave as any, { passive: true } as any);
		doc.addEventListener('mouseenter', onEnter as any, { passive: true } as any);
		doc.addEventListener('mouseleave', onLeave as any, { passive: true } as any);

		return () => {
			win.removeEventListener('mouseenter', onEnter as any);
			win.removeEventListener('mouseleave', onLeave as any);
			doc.removeEventListener('mouseenter', onEnter as any);
			doc.removeEventListener('mouseleave', onLeave as any);
		};
	}, []);

	// 事件：用户活跃度（pointer/keyboard/touch/scroll）带 rAF 降噪
	useEffect(() => {
		if (!win || !doc) {
			return () => {
				//
			};
		}

		let stop = false;

		const onActivity = () => {
			if (rafLockRef.current) return;
			rafLockRef.current = true;
			if (typeof win.requestAnimationFrame === 'function') {
				win.requestAnimationFrame(() => {
					rafLockRef.current = false;
					if (!stop) bumpUserActive();
				});
			} else {
				win.setTimeout(() => {
					rafLockRef.current = false;
					if (!stop) bumpUserActive();
				}, 16);
			}
		};

		// 优先尝试 Idle Detection（跨 iframe/窗口、系统级，Chromium）
		const tryIdleDetector = async () => {
			// @ts-ignore
			if ('IdleDetector' in win) {
				try {
					// @ts-ignore
					const perm = await (navigator as any).permissions?.query?.({ name: 'idle-detection' as any });
					if (perm && perm.state === 'denied') throw new Error('idle-detection denied');
					// @ts-ignore
					const detector = new (win as any).IdleDetector();
					detector.addEventListener('change', () => {
						// userState: 'active' | 'idle'
						const idle = detector.userState !== 'active';
						setIsUserIdle(idle);
					});
					await detector.start({ threshold: idleTimeoutMs });
					usingIdleDetectorRef.current = true;
					// 初始化一次
					const idleInit = detector.userState !== 'active';
					setIsUserIdle(idleInit);
					return true;
				} catch {
					usingIdleDetectorRef.current = false;
					return false;
				}
			}
			return false;
		};

		const attachManualListeners = () => {
			const targets: Array<EventTarget> = [win, doc];
			const eventNames = [
				'pointermove', 'pointerdown', 'pointerup',
				'wheel', 'scroll',
				'keydown', 'keyup', 'keypress',
				'mousemove', 'mousedown', 'mouseup',
				'touchstart', 'touchmove', 'touchend'
			] as const;

			for (const t of targets) {
				for (const ev of eventNames) {
					// @ts-ignore
					t.addEventListener(ev, onActivity, { passive: true, capture: true });
				}
			}

			// 初始设为在阈值后空闲，直到第一次交互
			clearIdleTimer();
			idleTimerRef.current = win.setTimeout(() => {
				setIsUserIdle(true);
			}, idleTimeoutMs) as unknown as number;

			return () => {
				for (const t of targets) {
					for (const ev of eventNames) {
						// @ts-ignore
						t.removeEventListener(ev, onActivity, { capture: true } as any);
					}
				}
				clearIdleTimer();
			};
		};

		let detach: (() => void) | undefined;
		(async () => {
			const ok = await tryIdleDetector();
			if (!ok) {
				detach = attachManualListeners();
			}
		})();

		return () => {
			stop = true;
			detach?.();
		};
	}, [idleTimeoutMs]);

	// 是否处于有效统计状态
	const isEngaging = useMemo(
		() => isTabActive && isMouseInWindow && !isUserIdle,
		[isTabActive, isMouseInWindow, isUserIdle]
	);

	// 处理进入/退出有效统计的起止与累积
	useEffect(() => {
		if (!win) {
			return () => {};
		}
		if (isEngaging) {
			// 刚进入
			sessionStartAtRef.current = performance.now();
			onStartEngageRef.current?.();

			// 开始节流刷新，使 UI/回调定期得到更新
			clearTickTimer();
			tickTimerRef.current = (win ?? window)?.setInterval?.(() => {
				if (sessionStartAtRef.current !== null) {
					const now = performance.now();
					const liveTotal = accumulatedMsRef.current + (now - sessionStartAtRef.current);
					setTotalMs(liveTotal);
					onTickRef.current?.(liveTotal);
				}
			}, tickIntervalMs) as unknown as number;
		} else {
			// 刚离开
			if (sessionStartAtRef.current !== null) {
				const now = performance.now();
				const sessionMs = now - sessionStartAtRef.current;
				accumulatedMsRef.current += sessionMs;
				sessionStartAtRef.current = null;

				setTotalMs(accumulatedMsRef.current);
				onStopEngageRef.current?.(sessionMs);
			}
			clearTickTimer();
		}

		return () => {
			// 清理 interval 在依赖变化或卸载时
			if (!isEngaging) {
				clearTickTimer();
			}
		};
	}, [isEngaging, tickIntervalMs]);

	// 卸载或页面关闭前确保累积与上报
	useEffect(() => {
		if (!win) {
			return () => {
				//
			};
		}
		const finalize = () => {
			if (sessionStartAtRef.current !== null) {
				const now = performance.now();
				const sessionMs = now - sessionStartAtRef.current;
				accumulatedMsRef.current += sessionMs;
				sessionStartAtRef.current = null;
			}
			setTotalMs(accumulatedMsRef.current);
		};

		const beforeUnload = () => {
			finalize();
		};

		win.addEventListener('beforeunload', beforeUnload as any);
		return () => {
			beforeUnload();
			win.removeEventListener('beforeunload', beforeUnload as any);
		};
	}, []);

	const reset = () => {
		clearTickTimer();
		accumulatedMsRef.current = 0;
		sessionStartAtRef.current = null;
		setTotalMs(0);
	};

	return { totalMs, isEngaging, reset };
}

