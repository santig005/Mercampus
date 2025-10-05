'use client';
import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';

export default function BannerAd({
	images = [
		'/images/banner/1.png',
		'/images/banner/2.png',
		'/images/banner/3.png',
	],
	hrefs = [null, null, null], // opcional: links por slide (mismo largo que images)
	altTexts,
	autoPlayMs = 3500,
	swipeThreshold = 40, // píxeles para considerar swipe
}) {
	const validImages = useMemo(() => images.filter(Boolean), [images]);
	const slidesCount = validImages.length;

	const [index, setIndex] = useState(0);
	const [isHover, setIsHover] = useState(false);

	// Touch tracking
	const startXRef = useRef(0);
	const startYRef = useRef(0);
	const deltaXRef = useRef(0);
	const deltaYRef = useRef(0);
	const swipingRef = useRef(false);
	const tappingRef = useRef(true); // si no hubo swipe, se considera tap

	const timerRef = useRef(null);

	const goTo = (next) => {
		if (!slidesCount) return;
		const clamped = ((next % slidesCount) + slidesCount) % slidesCount;
		setIndex(clamped);
	};

	// Autoplay con pausa en hover o cuando hay 1 solo slide
	useEffect(() => {
		if (isHover || slidesCount <= 1) return;
		timerRef.current = setInterval(() => goTo(index + 1), autoPlayMs);
		return () => {
			if (timerRef.current) clearInterval(timerRef.current);
			timerRef.current = null;
		};
	}, [index, isHover, slidesCount, autoPlayMs]);

	// Reiniciar índice si cambia el set de imágenes
	useEffect(() => {
		setIndex(0);
	}, [slidesCount]);

	// Accesibilidad con teclado
	const onKeyDown = (e) => {
		if (slidesCount <= 1) return;
		if (e.key === 'ArrowRight') goTo(index + 1);
		if (e.key === 'ArrowLeft') goTo(index - 1);
		if (e.key === 'Enter' || e.key === ' ') {
			// click por teclado si hay link
			const href = hrefs?.[index];
			if (href) window.location.href = href;
		}
	};

	// Handlers touch para swipe + tap
	const onTouchStart = (e) => {
		const t = e.touches[0];
		startXRef.current = t.clientX;
		startYRef.current = t.clientY;
		deltaXRef.current = 0;
		deltaYRef.current = 0;
		swipingRef.current = false;
		tappingRef.current = true;
	};

	const onTouchMove = (e) => {
		const t = e.touches[0];
		deltaXRef.current = t.clientX - startXRef.current;
		deltaYRef.current = t.clientY - startYRef.current;

		// Si se está desplazando más horizontal que vertical y supera umbral pequeño, marcamos swipe
		if (
			Math.abs(deltaXRef.current) > 10 &&
			Math.abs(deltaXRef.current) > Math.abs(deltaYRef.current)
		) {
			swipingRef.current = true;
			tappingRef.current = false;
			// evitamos el scroll vertical de la página cuando el gesto es horizontal
			e.preventDefault();
		}
	};

	const onTouchEnd = () => {
		const dx = deltaXRef.current;
		const dy = deltaYRef.current;

		// Si fue swipe horizontal significativo
		if (
			swipingRef.current &&
			Math.abs(dx) > swipeThreshold &&
			Math.abs(dx) > Math.abs(dy)
		) {
			if (dx < 0) goTo(index + 1); // swipe izquierda → siguiente
			else goTo(index - 1); // swipe derecha → anterior
			return;
		}

		// Si no hubo swipe → tratar como tap/click en el banner actual (si hay link)
		if (tappingRef.current) {
			const href = hrefs?.[index];
			if (href) window.location.href = href;
		}
	};

	const currentHref = hrefs?.[index] || null;

	return (
		<div
			className={`relative mx-auto w-full max-w-[800px] aspect-[400/115] select-none ${
				currentHref ? 'cursor-pointer' : ''
			}`}
			role="region"
			aria-roledescription="carousel"
			aria-label="Banner publicitario"
			tabIndex={0}
			onKeyDown={onKeyDown}
			onMouseEnter={() => setIsHover(true)}
			onMouseLeave={() => setIsHover(false)}
			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}
			// Click para desktop: si hay href, navega
			onClick={() => {
				if (currentHref) window.location.href = currentHref;
			}}
		>
			{/* Track */}
			<div className="absolute inset-0 overflow-hidden rounded-md">
				<div
					className="h-full w-full flex transition-transform duration-500 ease-out"
					style={{ transform: `translateX(-${index * 100}%)` }}
				>
					{validImages.map((src, i) => {
						const slide = (
							<div
								key={`banner-slide-${i}`}
								className="relative h-full w-full shrink-0"
							>
								<Image
									src={src}
									alt={
										altTexts && altTexts[i]
											? altTexts[i]
											: `Publicidad ${i + 1}`
									}
									fill
									priority={i === 0}
									draggable={false}
									className="object-contain"
									sizes="(max-width: 640px) 400px, (max-width: 768px) 500px, (max-width: 1024px) 600px, (max-width: 1280px) 700px, 800px"
								/>
							</div>
						);

						// Para SEO/accesibilidad, si el slide tiene href propio,
						// lo envolvemos en Link; si no, devolvemos el slide pelado.
						const href = hrefs?.[i];
						return href ? (
							<Link
								key={`banner-slide-${i}`}
								href={href}
								aria-label={`Abrir anuncio ${i + 1}`}
								className="h-full w-full shrink-0"
							>
								{slide}
							</Link>
						) : (
							slide
						);
					})}
				</div>
			</div>

			{/* Dots */}
			{slidesCount > 1 && (
				<div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-white/85 px-2 py-1 shadow-sm backdrop-blur">
					{validImages.map((_, i) => (
						<button
							key={`banner-dot-${i}`}
							aria-label={`Ir al slide ${i + 1}`}
							aria-current={i === index}
							className={`h-2.5 rounded-full transition-all ${
								i === index
									? 'w-5 bg-black'
									: 'w-2.5 bg-gray-400/80 hover:bg-gray-500'
							}`}
							onClick={(e) => {
								e.stopPropagation(); // no dispare navegación
								goTo(i);
							}}
						/>
					))}
				</div>
			)}

			{/* Flechas (ocultas en móvil) */}
			{slidesCount > 1 && (
				<>
					<button
						aria-label="Anterior"
						onClick={(e) => {
							e.stopPropagation();
							goTo(index - 1);
						}}
						className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full bg-white/85 hover:bg-white shadow"
					>
						‹
					</button>
					<button
						aria-label="Siguiente"
						onClick={(e) => {
							e.stopPropagation();
							goTo(index + 1);
						}}
						className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 items-center justify-center rounded-full bg-white/85 hover:bg-white shadow"
					>
						›
					</button>
				</>
			)}
		</div>
	);
}
