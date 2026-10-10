"use client";

import React from "react";
import { CardCarousel } from "@/components/ui/card-carousel";

export const CardCarouselDemo = () => {
  const images = [
    {
      src: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
      alt: "Computational Art 1",
    },
    {
      src: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      alt: "Geometric Flow 2",
    },
    {
      src: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=800&auto=format&fit=crop&q=80",
      alt: "Tensor Space 3",
    },
    {
      src: "https://images.unsplash.com/photo-1633493106185-3ac8f10672e8?w=800&auto=format&fit=crop&q=80",
      alt: "Neural Network 4",
    },
  ];

  return (
    <div className="w-full">
      <CardCarousel
        images={images}
        autoplayDelay={2000}
        showPagination={true}
        showNavigation={true}
      />
    </div>
  );
};

export default CardCarouselDemo;
