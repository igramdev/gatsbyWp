import React, { useEffect, useRef, useState } from "react";

import { gsap } from 'gsap';
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";

import { GatsbyImage, getImage } from 'gatsby-plugin-image';
import { getVimeoThumbnail } from '../utils/getVimeoThumbnail';
import { pixelateImage } from '../utils/pixelateImage';
//import Marquee from 'react-fast-marquee';
import * as projectStyles from '../css/components/project.module.scss';

import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';


import SwiperCore, { Autoplay, FreeMode } from 'swiper';

// Swiperモジュールをインストール
SwiperCore.use([Autoplay, FreeMode]);

gsap.registerPlugin(ScrollTrigger);

const GalleryMarquee = React.memo(({ media, speed, postIndex }) => {
  const [pixelatedImages, setPixelatedImages] = useState([]);
  const marqueeRef = useRef(null);

  useEffect(() => {
    const pixelateMedia = async () => {
      const pixelated = await Promise.all(media.map(async (item) => {
        if (item.mediaCheck === 'photo' && item.photo) {
          const gatsbyImageData = getImage(item.photo.node.localFile.childImageSharp.gatsbyImageData);
          const originalSrc = gatsbyImageData.images.fallback.src;
          return new Promise((resolve) => {
            pixelateImage(originalSrc, 150, (pixelatedSrc) => {
              resolve({
                ...item,
                photo: {
                  ...item.photo,
                  pixelatedSrc,
                },
              });
            });
          });
        } else if (item.mediaCheck === 'video' && item.video) {
          const thumbnailUrl = await getVimeoThumbnail(item.video);
          return new Promise((resolve) => {
            pixelateImage(thumbnailUrl, 150, (pixelatedSrc) => {
              resolve({
                ...item,
                video: {
                  ...item.video,
                  pixelatedSrc,
                },
              });
            });
          });
        }
        return item;
      }));
      setPixelatedImages(pixelated);
    };

    pixelateMedia();
  }, [media]);

  useEffect(() => {
    ScrollTrigger.refresh();
    if (pixelatedImages.length === 0) return;

    pixelatedImages.forEach((item, index) => {

      ScrollTrigger.create({
        trigger: `#projects`,
        start: "top 0%",
        endTrigger: "footer", // フッター要素を終了トリガーとする
        end: "top bottom",
        markers: false,
        toggleActions: "play none none none",
        onEnter: () => {
          gsap.to(`.media-pixel`, { zIndex: -2, stagger: 0.1 });
          gsap.to(`.media-origital`, { zIndex: 2, stagger: 0.1 });
        },
        onLeaveBack: () => {
          //gsap.to(`.media-pixel`, { autoAlpha: 1, stagger: 0.05 });
          //gsap.to(`.media-origital`, { autoAlpha: 0, stagger: 0.05 });
        }
      });


    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, [pixelatedImages, postIndex]);

  const slideLength = 5; // 実際のスライドの長さに応じて設定してください

  return (
    <div ref={marqueeRef}>
      <Swiper
        spaceBetween={0}
        slidesPerView="auto"
        loop={true}
        loopedSlides={slideLength}
        speed={6000}
        autoplay={{
          delay: 0,
          disableOnInteraction: false,
        }}
        freeMode={{
          enabled: true,
          momentum: false,
        }}
        onSwiper={(swiper) => console.log(swiper)}
        onSlideChange={() => console.log('slide change')}
      >
        {pixelatedImages.map((item, index) => (
          <SwiperSlide key={index}>
            <div className="">
              {
                item.mediaCheck === 'photo' && item.photo && (
                  <div className={projectStyles.item}>
                    <div className={projectStyles.photo}>
                      <GatsbyImage
                        image={item.photo.node.localFile.childImageSharp.gatsbyImageData}
                        style={{ width: '100%', height: '100%' }}
                        alt={item.photo.node.altText || 'デフォルトのサイト名'} />
                      {/*<div className="media-wrap">
                        <div className="media-pixel">
                          <img
                            src={item.photo.pixelatedSrc}
                            alt={item.photo.node.altText || 'デフォルトのサイト名'} />
                        </div>
                        <div className="media-origital">
                          <GatsbyImage
                            image={item.photo.node.localFile.childImageSharp.gatsbyImageData}
                            style={{ width: '100%', height: '100%' }}
                            alt={item.photo.node.altText || 'デフォルトのサイト名'} />
                        </div>
                      </div>*/}

                    </div>
                  </div>
                )
              }
              {
                item.mediaCheck === 'video' && item.video && (
                  <div className={projectStyles.item}>
                    <div className={projectStyles.video} style={{ aspectRatio: item.aspectRatio }}>
                      <iframe
                        //src={`https://player.vimeo.com/video/${item.video}?background=1`}
                        src={`https://player.vimeo.com/video/${item.video}?autoplay=1&loop=1&title=0&byline=0&portrait=0&controls=0&muted=1&autopause=0`}
                        title="vimeo"
                        loading="lazy"
                        frameBorder="0"
                        allow="autoplay;"
                      ></iframe>
                    </div>
                    {/*<div className="media-wrap">
                      <div className="media-pixel">
                        <img
                          src={item.video.pixelatedSrc}
                          style={{ width: '100%', height: '100%' }}
                          alt="ピクセル化されたビデオサムネイル" />
                      </div>
                      <div className="media-origital">
                        <div className={projectStyles.video} style={{ aspectRatio: item.aspectRatio }}>
                          <iframe
                            src={`https://player.vimeo.com/video/${item.video}?background=1`}
                            title="vimeo"
                            loading="lazy"
                            frameBorder="0"
                            allow="autoplay;"
                          ></iframe>
                        </div>
                      </div>
                    </div>*/}

                  </div>
                )
              }
            </div>
          </SwiperSlide>
        ))}

      </Swiper>
    </div>
  );
});

export default GalleryMarquee;
