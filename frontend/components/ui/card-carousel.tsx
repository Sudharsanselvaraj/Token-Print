"use client";

import React from "react";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import "swiper/css/effect-coverflow";
import "swiper/css/pagination";
import "swiper/css/navigation";
import { SparklesIcon, Play, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Autoplay,
  EffectCoverflow,
  Navigation,
  Pagination,
} from "swiper/modules";

import { Badge } from "@/components/ui/badge";
import { assetUrl } from "@/lib/assets";

export interface CarouselItem {
  id?: string;
  src: string;
  alt: string;
  badge?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  tags?: string[];
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  secondaryAction?: {
    label?: string;
    title?: string;
    onClick?: () => void;
    href?: string;
    icon?: React.ReactNode;
  };
}

export interface CardCarouselProps {
  badgeText?: string;
  badgeIcon?: React.ReactNode;
  title?: string;
  subtitle?: string;
  items?: CarouselItem[];
  images?: { src: string; alt: string }[];
  autoplayDelay?: number;
  showPagination?: boolean;
  showNavigation?: boolean;
  maxWidth?: string;
}

export const CardCarousel: React.FC<CardCarouselProps> = ({
  badgeText = "Latest component",
  badgeIcon,
  title = "Card Carousel",
  subtitle = "Seamless Images carousel animation.",
  items,
  images,
  autoplayDelay = 2500,
  showPagination = true,
  showNavigation = true,
  maxWidth = "max-w-5xl",
}) => {
  // Normalize items from either items or images
  const slideList: CarouselItem[] = items ?? (images ? images.map((img) => ({
    src: img.src,
    alt: img.alt,
    title: img.alt,
  })) : []);

  const css = `
  .tokenprint-carousel .swiper {
    width: 100%;
    padding-top: 10px;
    padding-bottom: 52px;
  }
  
  .tokenprint-carousel .swiper-slide {
    background-position: center;
    background-size: cover;
    width: 340px;
    max-width: 86vw;
    transition: transform 0.3s ease, opacity 0.3s ease;
  }
  
  .tokenprint-carousel .swiper-3d .swiper-slide-shadow-left,
  .tokenprint-carousel .swiper-3d .swiper-slide-shadow-right {
    background-image: none !important;
  }

  .tokenprint-carousel .swiper-pagination-bullet {
    background: rgba(255, 255, 255, 0.25);
    opacity: 0.6;
    width: 8px;
    height: 8px;
    transition: all 0.25s ease;
  }

  .tokenprint-carousel .swiper-pagination-bullet-active {
    background: #38BDF8;
    opacity: 1;
    width: 24px;
    border-radius: 4px;
  }

  .tokenprint-carousel .swiper-button-prev,
  .tokenprint-carousel .swiper-button-next {
    color: #F4F4F5;
    background: rgba(20, 21, 26, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    width: 40px;
    height: 40px;
    border-radius: 50%;
    backdrop-filter: blur(8px);
    transition: all 0.2s ease;
  }

  .tokenprint-carousel .swiper-button-prev:hover,
  .tokenprint-carousel .swiper-button-next:hover {
    background: rgba(35, 38, 46, 0.95);
    border-color: rgba(56, 189, 248, 0.5);
    color: #38BDF8;
  }

  .tokenprint-carousel .swiper-button-prev::after,
  .tokenprint-carousel .swiper-button-next::after {
    font-size: 14px;
    font-weight: 700;
  }
  `;

  return (
    <section className="tokenprint-carousel w-full space-y-4">
      <style>{css}</style>
      <div className={`mx-auto w-full ${maxWidth} rounded-[24px] border border-white/10 p-2 shadow-2xl md:rounded-[44px]`}>
        <div className="relative mx-auto flex w-full flex-col rounded-[20px] border border-white/10 bg-neutral-900/60 p-4 shadow-sm backdrop-blur-md md:rounded-[40px] md:p-6">
          {/* Top Badge */}
          <Badge
            variant="outline"
            className="absolute left-4 top-5 rounded-[14px] border border-white/20 bg-black/40 px-3 py-1 text-xs md:text-sm md:left-6 text-white backdrop-blur-sm"
          >
            {badgeIcon ?? <SparklesIcon className="fill-[#EEBDE0] stroke-1 text-white mr-1.5" size={14} />}
            <span>{badgeText}</span>
          </Badge>

          {/* Header Title & Subtitle */}
          <div className="flex flex-col justify-center pb-4 pl-2 pt-12 md:items-center w-full text-center">
            <h3 className="marshal-showcase-title text-3xl md:text-4xl opacity-95 font-light tracking-tight">
              {title}
            </h3>
            {subtitle && (
              <p className="text-neutral-400 text-sm max-w-xl mx-auto leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>

          {/* Carousel Swiper */}
          <div className="flex w-full items-center justify-center">
            <div className="w-full">
              <Swiper
                spaceBetween={40}
                autoplay={{
                  delay: autoplayDelay,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }}
                effect={"coverflow"}
                grabCursor={true}
                centeredSlides={true}
                loop={slideList.length > 2}
                slidesPerView={"auto"}
                coverflowEffect={{
                  rotate: 0,
                  stretch: 0,
                  depth: 120,
                  modifier: 2.2,
                  slideShadows: false,
                }}
                pagination={
                  showPagination
                    ? {
                        clickable: true,
                      }
                    : false
                }
                navigation={showNavigation}
                modules={[EffectCoverflow, Autoplay, Pagination, Navigation]}
              >
                {slideList.map((item, index) => (
                  <SwiperSlide key={item.id ?? index}>
                    <div className="group relative flex flex-col overflow-hidden rounded-[20px] border border-white/15 bg-[#0C0D10] shadow-xl transition-all duration-300 hover:border-sky-400/50 hover:shadow-sky-500/10">
                      {/* Slide Image visual */}
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/60">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={assetUrl(item.src)}
                          alt={item.alt}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0C0D10] via-transparent to-black/20" />
                        
                        {item.badge && (
                          <div className="absolute top-3 left-3">
                            <span className="rounded-md border border-sky-400/30 bg-sky-950/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300 backdrop-blur-md">
                              {item.badge}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Slide Card Content */}
                      <div className="flex flex-col p-5 text-left">
                        {item.subtitle && (
                          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                            {item.subtitle}
                          </span>
                        )}
                        {item.title && (
                          <h4 className="mt-1 text-lg font-semibold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                            {item.title}
                          </h4>
                        )}
                        {item.description && (
                          <p className="mt-2 text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                        )}

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {item.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded border border-white/10 bg-neutral-900/90 px-2 py-0.5 text-[10px] text-neutral-400"
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Action buttons */}
                        {(item.primaryAction || item.secondaryAction) && (
                          <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3">
                            {item.primaryAction && (
                              item.primaryAction.href ? (
                                <Link
                                  href={item.primaryAction.href}
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                                  style={{
                                    backgroundColor: "#FFFFFF",
                                    color: "#09090B",
                                    textDecoration: "none",
                                  }}
                                >
                                  <Play size={12} fill="#09090B" color="#09090B" />
                                  <span style={{ color: "#09090B", fontWeight: 700 }}>{item.primaryAction.label}</span>
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={item.primaryAction.onClick}
                                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                                  style={{
                                    backgroundColor: "#FFFFFF",
                                    color: "#09090B",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                >
                                  <Play size={12} fill="#09090B" color="#09090B" />
                                  <span style={{ color: "#09090B", fontWeight: 700 }}>{item.primaryAction.label}</span>
                                </button>
                              )
                            )}

                            {item.secondaryAction && (
                              item.secondaryAction.href ? (
                                <Link
                                  href={item.secondaryAction.href}
                                  title={item.secondaryAction.title ?? item.secondaryAction.label}
                                  className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-neutral-900 px-2.5 py-2 text-xs transition-colors hover:border-white/30 hover:text-white"
                                  style={{ color: "#E4E4E7" }}
                                >
                                  {item.secondaryAction.icon ?? <ExternalLink size={13} color="#E4E4E7" />}
                                </Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={item.secondaryAction.onClick}
                                  title={item.secondaryAction.title ?? item.secondaryAction.label}
                                  className="inline-flex items-center justify-center rounded-lg border border-white/15 bg-neutral-900 px-2.5 py-2 text-xs transition-colors hover:border-white/30 hover:text-white"
                                  style={{ color: "#E4E4E7", cursor: "pointer" }}
                                >
                                  {item.secondaryAction.icon ?? <ExternalLink size={13} color="#E4E4E7" />}
                                </button>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
