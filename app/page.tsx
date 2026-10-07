"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

export default function Home() {
	return (
		<div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[var(--color-forest)] via-[rgba(95,141,78,0.65)] to-[var(--color-parchment-dim)] text-[var(--color-parchment)]">
			<div className="absolute inset-0 bg-gradient-to-br from-[rgba(40,84,48,0.7)] via-[rgba(95,141,78,0.4)] to-[rgba(229,217,182,0.3)] animate-pulse" />
			<div className="pointer-events-none absolute -left-1/2 top-24 h-10 w-[200%] bg-gradient-to-r from-transparent via-[rgba(229,217,182,0.18)] to-transparent blur-md animate-scroll-plane" />
			<div className="absolute left-10 top-16 h-24 w-24 rounded-full bg-[rgba(164,190,123,0.1)] blur-3xl animate-bounce" style={{ animationDelay: "200ms" }} />
			<div className="absolute right-10 top-28 h-20 w-20 rounded-full bg-[rgba(95,141,78,0.15)] blur-3xl animate-bounce" style={{ animationDelay: "500ms" }} />
			<div className="absolute bottom-20 left-28 h-28 w-28 rounded-full bg-[rgba(229,217,182,0.1)] blur-3xl animate-bounce" style={{ animationDelay: "700ms" }} />
			<div className="absolute bottom-16 right-20 h-24 w-24 rounded-full bg-[rgba(40,84,48,0.2)] blur-3xl animate-bounce" style={{ animationDelay: "1000ms" }} />

			<nav className="relative z-20 w-full h-17 bg-gradient-to-r from-[#E5D9B6] to-[#D4C89E] border-b border-[rgba(40,84,48,0.06)] py-1 px-6">
				<div className="w-full flex items-center justify-between">
					<Link href="/" className="flex items-center gap-3 ">
						<Image
							src="/favicon.png"
							width={60}
							height={60}
							alt="BadrLink favicon"
							className=""
						/>
						<span className="font-display text-3xl font-bold text-transparent bg-clip-text hidden sm:block bg-gradient-to-r from-[var(--color-fern)] via-[var(--color-sage)] to-[var(--color-forest)] animate-pulse">
							BadrLink
						</span>
					</Link>
					<div className="flex items-center gap-2 py-2 relative left-0 lg:py-2">
						<Link
							href="/login"
							className="rounded-xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-5 py-2 text-sm font-semibold text-[var(--color-parchment)] transition-all cursor-pointer"
						>
							Sign Up
						</Link>
						<Link
							href="/login"
							className="rounded-xl border border-[rgba(229,217,182,0.4)] bg-gradient-to-r from-[var(--color-sage)] to-[var(--color-fern)] px-5 py-2 text-sm text-[rgba(229,217,182,0.95)] transition-all cursor-pointer"
						>
							Log In
						</Link>
					</div>
				</div>
			</nav>

			<main className="relative z-10 flex min-h-[calc(100vh-72px)] flex-col items-center justify-center px-6 py-12">
				<div className="grid w-full max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-2">
					<div className="flex flex-col gap-6 text-left">
						<motion.div
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8 }}
							className="space-y-3"
						>

							<h1 className="font-display text-4xl font-bold text-transparent bg-gradient-to-r from-[var(--color-parchment)] via-[var(--color-sage)] to-[var(--color-parchment)] bg-clip-text sm:text-5xl lg:text-6xl">
								Where words feel closer.
								<br />
								<span className="italic">And people do too.</span>
							</h1>
							<p className="text-base text-[rgba(164,190,123,0.95)] lg:text-lg">
								A web-based app that keeps you connected with the people who matter most.
							</p>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.15 }}
							className="flex flex-wrap gap-3"
						>
							<Link
								href="/login"
								className="rounded-2xl bg-gradient-to-r from-[var(--color-fern)] to-[var(--color-sage)] px-8 py-3 text-xl cursor-pointer font-semibold text-[var(--color-parchment)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_30px_rgba(95,141,78,0.3)] active:scale-[0.97]"
							>
								Get Started →
							</Link>
							<button className="rounded-2xl border border-[rgba(229,217,182,0.3)] px-6 py-3 text-xl text-[rgba(229,217,182,0.9)] backdrop-blur-sm transition-all hover:bg-[rgba(229,217,182,0.1)]">
								Why BadrLink?
							</button>
						</motion.div>

						<motion.p
							initial={{ opacity: 0, y: 16 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.8, delay: 0.3 }}
							className="font-display text-2xl italic text-transparent bg-gradient-to-r from-[var(--color-parchment)] via-[var(--color-sage)] to-[var(--color-parchment)] bg-clip-text md:text-xl"
						>
							“Closer than a whisper, warmer than a thought.”
						</motion.p>

									<motion.div
										initial={{ opacity: 0, y: 16 }}
										animate={{ opacity: 1, y: 0 }}
										transition={{ duration: 0.8, delay: 0.45 }}
										className="grid grid-cols-3 gap-3 text-sm text-[rgba(229,217,182,0.9)]"
									>
										<div className="px-4 border-r border-[rgba(229,217,182,0.2)] text-lg">
											<div>Fast enough.</div>
											<div className="text-xl text-[rgba(164,190,123,0.9)]">Real time</div>
										</div>
										<div className="px-4 border-r border-[rgba(229,217,182,0.2)] text-lg">
											<div>Private.</div>
											<div className="text-xl text-[rgba(164,190,123,0.9)]">Encrypted</div>
										</div>
										<div className="px-4 text-lg">
											<div>Simple.</div>
											<div className="text-xl text-[rgba(164,190,123,0.9)]">No clutter</div>
										</div>
									</motion.div>
					</div>

					<div className="relative flex items-center justify-center lg:translate-x-25">
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.9, delay: 0.2 }}
						>
							<Image
								src="/texting_image_new.png"
								alt="Texting illustration"
								width={240}
								height={240}
								className="h-75 w-75 object-contain drop-shadow-[0_8px_24px_rgba(95,141,78,0.3)] md:h-120 md:w-120 rounded-xl"
							/>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, x: -28 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.7, delay: 0.2 }}
							className="pointer-events-none absolute left-0 top-3 rounded-2xl rounded-bl-xs border border-[rgba(164,190,123,0.2)] bg-gradient-to-br from-[rgba(40,84,48,0.8)] to-[rgba(95,141,78,0.6)] px-4 py-3 text-xs text-[var(--color-parchment)] shadow-lg  max-w-[180px] animate-float lg:left-5 lg:top-4 lg:translate-x-0"
						>
							<span className="text-xl">A: You still up?</span>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, x: 28 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.7, delay: 0.3 }}
							className="pointer-events-none absolute right-0 top-20 rounded-2xl rounded-br-xs border border-[rgba(229,217,182,0.3)] bg-gradient-to-tr from-[rgba(164,190,123,0.7)] to-[rgba(229,217,182,0.6)] px-4 py-3 text-xs text-[var(--color-forest)] shadow-lg  max-w-[180px] animate-float-slow lg:left-auto lg:-right-20 lg:top-20 lg:translate-x-0"
						>
							<span className="text-xl">B: Yeah, can&apos;t sleep</span>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, x: 28 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.7, delay: 0.45 }}
							className="pointer-events-none absolute right-0 top-60 rounded-2xl rounded-br-xs border border-[rgba(229,217,182,0.3)] bg-gradient-to-tr from-[rgba(164,190,123,0.7)] to-[rgba(229,217,182,0.6)] px-4 py-3 text-xs text-[var(--color-forest)] shadow-lg  max-w-[180px] animate-float lg:left-auto lg:-right-20 lg:bottom-0 lg:top-auto lg:translate-x-0"
						>
							<span className="text-xl">B: Always, what&apos;s on your mind?</span>
						</motion.div>
						<motion.div
							initial={{ opacity: 0, x: -28 }}
							animate={{ opacity: 1, x: 0 }}
							transition={{ duration: 0.7, delay: 0.35 }}
							className="pointer-events-none absolute left-0 top-40  rounded-2xl rounded-bl-xs border border-[rgba(164,190,123,0.2)] bg-gradient-to-br from-[rgba(40,84,48,0.8)] to-[rgba(95,141,78,0.6)] px-4 py-3 text-xs text-[var(--color-parchment)] shadow-lg  max-w-[180px] animate-float-slow lg:left-5 lg:bottom-24 lg:top-auto lg:translate-x-0"
						>
							<span className="text-xl">A: Same... wanna talk for a bit?</span>
						</motion.div>

					</div>
				</div>
			</main>
		</div>
	);
}
