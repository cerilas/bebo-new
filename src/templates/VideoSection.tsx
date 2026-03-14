'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

export const VideoSection = () => {
  const t = useTranslations('HowItWorks');
  const [isVisible, setIsVisible] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if script is already loaded
    if (typeof window !== 'undefined' && !(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      }
    }

    // Initialize player when API is ready
    (window as any).onYouTubeIframeAPIReady = () => {
      if (!playerRef.current) {
        playerRef.current = new (window as any).YT.Player('youtube-player', {
          videoId: '1BY2SaU8muA',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
          },
          events: {
            onReady: (event: any) => {
              setPlayer(event.target);
            },
          },
        });
      }
    };

    // If API is already loaded, initialize player
    if ((window as any).YT && (window as any).YT.Player) {
      (window as any).onYouTubeIframeAPIReady();
    }
  }, []);

  // Intersection Observer for auto-play
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsVisible(entry.isIntersecting);
        });
      },
      {
        threshold: 0.5, // Trigger when 50% of the video is visible
      },
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => {
      if (videoRef.current) {
        observer.unobserve(videoRef.current);
      }
    };
  }, []);

  // Auto-play/pause based on visibility
  useEffect(() => {
    if (player && player.playVideo && player.pauseVideo) {
      if (isVisible) {
        player.playVideo();
      } else {
        player.pauseVideo();
      }
    }
  }, [isVisible, player]);

  return (
    <section id="nasil-calisir" className="relative overflow-hidden bg-[#0a0a0f] pb-8 pt-24 md:pb-10 md:pt-32">
      {/* Background gradient effects */}
      <div className="absolute inset-0 z-0">
        <div className="absolute left-1/4 top-0 size-96 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-pink-500/20 blur-[120px]" />
      </div>

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <p className="mb-2 text-sm uppercase tracking-widest text-purple-400">
            Basit & Hızlı
          </p>
          <h2 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-6xl">
            {t('section_title')}
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-400">
            {t('section_subtitle')}
          </p>
        </div>

        {/* Video container */}
        <div
          ref={videoRef}
          className="group relative mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-sm transition-all duration-500 hover:border-white/20 hover:shadow-[0_0_60px_rgba(168,85,247,0.3)]"
        >
          {/* Inner container with gradient border effect */}
          <div className="relative overflow-hidden rounded-xl bg-black">
            {/* Gradient border animation */}
            <div className="absolute -inset-px -z-10 rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 opacity-0 blur-sm transition-opacity duration-500 group-hover:opacity-100" />

            {/* Video iframe */}
            <div className="relative aspect-video w-full">
              <div
                id="youtube-player"
                className="absolute inset-0 size-full"
              />
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};
