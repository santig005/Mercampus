'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { TbBrandWhatsapp } from 'react-icons/tb';
import Image from 'next/image';

export default function SquirrelGame() {
  const [position, setPosition] = useState(1); // 0: izquierda, 1: centro, 2: derecha
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [obstacles, setObstacles] = useState([]);
  const [cookies, setCookies] = useState([]);
  const [gameSpeed, setGameSpeed] = useState(80);
  const [touchStartX, setTouchStartX] = useState(null);

  // Ajuste de posiciones para centrar en carriles de 106px
  const LANE_POSITIONS = [23, 123, 223]; 
  const OBSTACLES = ['basura', 'obstaculo', 'perro'];
  const COLLISION_DISTANCE = 40;
  const playCookieSound = () => {
    new Audio('/sounds/cookie.mp3').play().catch(() => {});
  };
  
  const playCollisionSound = () => {
    new Audio('/sounds/gameover.mp3').play().catch(() => {});
  };


  const generateRandomElement = useCallback(() => {
    if (Math.random() < 0.2) { // 20% de probabilidad de galleta
      return {
        type: 'cookie',
        lane: Math.floor(Math.random() * 3),
        top: -50,
      };
    }
    return {
      type: OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)],
      lane: Math.floor(Math.random() * 3),
      top: -50,
    };
  }, []);

  const moveElements = useCallback(() => {
    setObstacles(prev => {
      const updated = prev.filter(obs => obs.top < 600).map(obs => ({
        ...obs,
        top: obs.top + gameSpeed
      }));
      
      updated.forEach(obs => {
        if (obs.lane === position && 
            Math.abs(obs.top - 450) < COLLISION_DISTANCE) {
              playCollisionSound();
          gameOver();
        }
      });

      return updated;
    });

    setCookies(prev => {
      const updated = prev.filter(cookie => cookie.top < 600).map(cookie => ({
        ...cookie,
        top: cookie.top + gameSpeed
      }));
      
      updated.forEach(cookie => {
        if (cookie.lane === position && 
            Math.abs(cookie.top - 450) < COLLISION_DISTANCE) {
              playCookieSound();
          setScore(score + 1);
          setGameSpeed(s => Math.min(s + 1, 100)); // Reducimos aceleración
        }
      });

      return updated.filter(cookie => 
        !(cookie.lane === position && 
        Math.abs(cookie.top - 450) < COLLISION_DISTANCE)
      );
    });
  }, [position, gameSpeed]);

  const gameOver = () => {
    setIsPlaying(false);
    setObstacles([]);
    setCookies([]);
  };

  // Control táctil para móviles
  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    if (!touchStartX) return;
    const touchEndX = e.touches[0].clientX;
    const difference = touchStartX - touchEndX;
  
    if (Math.abs(difference) > 50) { // Sensibilidad de desplazamiento
      if (difference > 0 && position > 0) { // Deslizando a la izquierda, mover hacia la izquierda
        setPosition(p => p - 1);
      } else if (difference < 0 && position < 2) { // Deslizando a la derecha, mover hacia la derecha
        setPosition(p => p + 1);
      }
      setTouchStartX(null);
    }
  };

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isPlaying) return;
      if (e.key === 'ArrowLeft' && position > 0) {
        setPosition(p => p - 1);
      } else if (e.key === 'ArrowRight' && position < 2) {
        setPosition(p => p + 1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, position]);

  useEffect(() => {
    let gameInterval;
    if (isPlaying) {
      gameInterval = setInterval(() => {
        moveElements();
        
        // Generar elementos con menor frecuencia y verificar superposición
        if (Math.random() < 0.07) { 
          const newElement = generateRandomElement();
          const lastElements = [...obstacles.slice(-3), ...cookies.slice(-3)];
          const isOverlapping = lastElements.some(el => 
            el.lane === newElement.lane && el.top > -100
          );

          if (!isOverlapping) {
            if (newElement.type === 'cookie') {
              setCookies(prev => [...prev, newElement]);
            } else {
              setObstacles(prev => [...prev, newElement]);
            }
          }
        }
      }, 60); // Intervalo más lento
    }
    return () => clearInterval(gameInterval);
  }, [isPlaying, moveElements, generateRandomElement, obstacles, cookies]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setGameSpeed(5);
    setPosition(1);
  };

  return (
    <div className="min-h-screen bg-orange-100 p-4" 
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-orange-800">
          ¡Mercardilla Recogegalletas!
        </h1>
        
        {!isPlaying && (
          <div className="text-center mb-8">
            <button 
              onClick={startGame}
              className="bg-orange-500 text-white px-8 py-4 rounded-lg text-xl hover:bg-orange-600 transition-colors"
            >
              ¡Comenzar Juego!
            </button>
          </div>
        )}

        <div className="relative h-[600px] w-[320px] mx-auto bg-orange-200 overflow-hidden border-4 border-orange-600 rounded-lg">
          {/* Carriles */}
          <div className="absolute h-full w-1 bg-orange-400 left-1/3"></div>
          <div className="absolute h-full w-1 bg-orange-400 left-2/3"></div>

          {/* Jugador */}
          {isPlaying && (
            <div 
              className="absolute transition-all duration-300 ease-in-out"
              style={{ left: LANE_POSITIONS[position] }}
            >
              <Image
                src="/ardilla.png"
                width={70}
                height={70}
                alt="Ardilla"
                className="relative top-[450px]"
                priority
              />
            </div>
          )}

          {/* Elementos del juego */}
          {obstacles.map((obs, i) => (
            <div
              key={`obs-${i}`}
              className="absolute"
              style={{
                left: LANE_POSITIONS[obs.lane],
                top: obs.top
              }}
            >
              <Image
                src={`/${obs.type}.png`}
                width={70}
                height={70}
                alt={obs.type}
                className="animate-pulse"
              />
            </div>
          ))}

          {cookies.map((cookie, i) => (
            <div
              key={`cookie-${i}`}
              className="absolute"
              style={{
                left: LANE_POSITIONS[cookie.lane] + 10,
                top: cookie.top
              }}
            >
              <Image
                src="/galleta.png"
                width={40}
                height={40}
                alt="Galleta"
                className="spin"
                style={{ backgroundColor: 'transparent' }}
              />
            </div>
          ))}

          {/* Puntaje */}
          {isPlaying && (
            <div className="absolute top-4 left-4 text-2xl font-bold text-white bg-orange-600 p-2 rounded">
              🍪 {score}
            </div>
          )}
        </div>

        {/* Controles táctiles para móviles */}
        {isPlaying && (
          <div className="flex justify-center gap-8 mt-4 md:hidden">
            <button 
              onClick={() => position > 0 && setPosition(p => p - 1)}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg"
            >
              ←
            </button>
            <button 
              onClick={() => position < 2 && setPosition(p => p + 1)}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg"
            >
              →
            </button>
          </div>
        )}

        <div className="mt-8 text-center text-orange-800">
          <p className="mb-4">Usa ←/→ o desliza horizontalmente para mover</p>
          <p>¡Recoge galletas y evita los obstáculos!</p>
          <p className="mt-2 text-sm">Cada galletas aumenta la velocidad!</p>
        </div>

        <div className="mt-8 text-center">
          <a
            href={`https://wa.me/+57${encodeURIComponent(3197139921)}?text=${encodeURIComponent(`¡Hola Mercampus! Tengo ${score} puntos en el juego de la ardilla 🐿️`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
          >
            Comparte tu puntaje <TbBrandWhatsapp className="ml-2 text-xl" />
          </a>
        </div>
      </div>

      <style jsx global>{`
        .spin {
          animation: spin 2s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}