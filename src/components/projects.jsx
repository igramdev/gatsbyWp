import React, { useContext, useMemo, useEffect, useRef, useState } from "react";
import { gsap } from 'gsap';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ProjectsContext } from '../contexts/ProjectsContext';
import { Link } from 'gatsby';
import { GatsbyImage, getImage } from 'gatsby-plugin-image';
//import PixelatedImage from './PixelatedImage';
//import { Pixelify } from "react-pixelify";


/* pixelate処理*/
import { pixelateImage } from '../utils/pixelateImage';
import { getVimeoThumbnail } from '../utils/getVimeoThumbnail';

import parse from 'html-react-parser';
import * as projectStyles from '../css/components/project.module.scss';
import { useSelectedValue } from '../contexts/SelectedValueContext';
import Marquee from 'react-fast-marquee';
import Star from "./star";

const fillColor = '#c9171e';

gsap.registerPlugin(ScrollToPlugin, ScrollTrigger);

const GalleryMarquee = React.memo(({ media, speed }) => {
  const [pixelatedImages, setPixelatedImages] = useState([]);
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
        } else if (item.mediaCheck === 'video' && item.shortVideo) {
          const thumbnailUrl = await getVimeoThumbnail(item.shortVideo);
          return new Promise((resolve) => {
            pixelateImage(thumbnailUrl, 150, (pixelatedSrc) => {
              resolve({
                ...item,
                shortVideo: {
                  ...item.shortVideo,
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
  return (
    <Marquee speed={speed} autoFill={true}>
      {
        pixelatedImages.map((item, index) => (
          (item.viewCheck === 'view1' || item.viewCheck === 'view3') && (
            <div className={projectStyles.item} key={index}>
              {item.mediaCheck === 'photo' && item.photo && (

                <div className={projectStyles.photo}>
                  {/*<GatsbyImage
                    image={item.photo.node.localFile.childImageSharp.gatsbyImageData}
                    style={{ width: '100%', height: '100%' }}
                    alt={item.photo.node.altText || 'デフォルトのサイト名'} />*/}
                  <img
                    src={item.photo.pixelatedSrc}
                    alt={item.photo.node.altText || 'デフォルトのサイト名'} />
                </div>
              )}
              {item.mediaCheck === 'video' && item.shortVideo && (
                <div className={projectStyles.video} style={{ aspectRatio: item.aspectRatio }}>
                  {/*<iframe
                    src={`https://player.vimeo.com/video/${item.shortVideo}?autoplay=0&loop=1&title=0&byline=0&portrait=0&controls=0&muted=1&autopause=0`}
                    title="vimeo"
                    loading="lazy"
                    frameBorder="0"
                    allow="autoplay;"
                  ></iframe>*/}
                  <img
                    src={item.shortVideo.pixelatedSrc}
                    style={{ width: '100%', height: '100%' }}
                    alt="ピクセル化されたビデオサムネイル" />
                </div>
              )}
            </div>
          )
        ))
      }
    </Marquee >
  );
});

const Projects = React.memo(() => {
  const { selectedValue } = useSelectedValue();
  const posts = useContext(ProjectsContext);

  const menuRef = useRef(null);
  const itemsRef = useRef([]);

  const useScrollableMenu = (posts, menuRef, itemsRef, selectedValue) => {

    useEffect(() => {
      console.log('useEffectが実行されました');

      const $menu = menuRef.current;
      if (!$menu || itemsRef.current.length === 0) return;

      const calculateWrapHeight = () => {
        const itemHeights = itemsRef.current.map(item => item ? item.clientHeight : 0);
        return itemHeights.reduce((total, height) => total + height, 0);
      };

      let wrapHeight = calculateWrapHeight();
      let scrollY = 0;

      const dispose = (scroll) => {
        if (itemsRef.current.length === 0) return;

        let cumulativeHeight = 0;
        const itemHeights = itemsRef.current.map(item => item ? item.clientHeight : 0);
        gsap.set(itemsRef.current, {
          y: (i) => {
            const position = cumulativeHeight + scroll;
            cumulativeHeight += itemHeights[i];
            return position;
          },
          modifiers: {
            y: (y) => {
              const s = gsap.utils.wrap(-itemHeights[0], wrapHeight - itemHeights[itemHeights.length - 1], parseInt(y));
              return `${s}px`;
            }
          }
        });
      };

      dispose(0);

      const handleMouseWheel = (e) => {
        scrollY -= e.deltaY;
        dispose(scrollY);
      };

      let touchStart = 0;
      let touchY = 0;
      const handleTouchStart = (e) => {
        touchStart = e.touches[0].clientY;
      };
      const handleTouchMove = (e) => {
        touchY = e.touches[0].clientY;
        scrollY += (touchY - touchStart) * 2.5;
        touchStart = touchY;
        dispose(scrollY);
      };

      const handleResize = () => {
        wrapHeight = calculateWrapHeight();
        dispose(scrollY);
      };

      setTimeout(() => {
        handleResize();
      }, 100);

      function isTablet() {
        return /iPad|Android|Tablet|PlayBook|Silk|Kindle|BlackBerry/.test(navigator.userAgent);
      }

      if (isTablet()) {
        $menu.addEventListener('touchstart', handleTouchStart);
        $menu.addEventListener('touchmove', handleTouchMove);
      } else {
        $menu.addEventListener('wheel', handleMouseWheel);
      }

      window.addEventListener('resize', handleResize);
      window.addEventListener('load', handleResize);
      window.addEventListener('scroll', handleResize);

      // 自動スクロールを設定
      const scrollSpeed = 1; // スクロールする速度を調整
      const autoScroll = () => {
        scrollY -= scrollSpeed;
        dispose(scrollY);
        requestAnimationFrame(autoScroll);
      };
      autoScroll();

      return () => {
        console.log('クリーンアップが実行されました！');

        if (isTablet()) {
          $menu.removeEventListener('touchstart', handleTouchStart);
          $menu.removeEventListener('touchmove', handleTouchMove);
        } else {
          $menu.removeEventListener('wheel', handleMouseWheel);
        }

        window.removeEventListener('resize', handleResize);
        window.removeEventListener('load', handleResize);
        window.removeEventListener('scroll', handleResize);
      };
    }, [posts, menuRef, itemsRef, selectedValue]);
  };

  useScrollableMenu(posts, menuRef, itemsRef, selectedValue);

  const renderedPosts = useMemo(() => (
    posts.map((post, index) => (
      <div key={post.uri} className={`${projectStyles.listItem} projects-item`} ref={el => itemsRef.current[index] = el}>
        <article className={projectStyles.post} itemScope itemType="http://schema.org/Article">
          <Link to={post.uri} itemProp="url" className={`${projectStyles.link} play-sound`}>
            <header className={projectStyles.meta}>
              <div className={`${projectStyles.metaList} ${projectStyles.layout1}`}>
                <div className={projectStyles.metaItem}>
                  <div className={projectStyles.metaItemChild}>
                    <h3 className={projectStyles.titleEn}>{post.projects.projectsTitleEn}</h3>
                  </div>
                </div>
                <div className={projectStyles.metaItem}>
                  <div className={projectStyles.metaItemChild}>
                    <div className={projectStyles.subTitleEn}>{post.projects.projectsSubtitleEn}</div>
                  </div>
                </div>
                <div className={projectStyles.metaItem}>
                  {post.categories.nodes && (
                    <ul className={projectStyles.catList}>
                      {post.categories.nodes.map((cat, index) => (
                        <li key={index}>{cat.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className={projectStyles.metaItem}>
                  {post.tags.nodes && (
                    <ul className={projectStyles.tagList}>
                      {post.tags.nodes.map((tags, index) => (
                        <li key={index}>{tags.name}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className={projectStyles.metaItem}>
                  <div className={projectStyles.date}>{post.date}</div>
                </div>
              </div>
              <div className={`${projectStyles.metaList} ${projectStyles.layout2}`}>
                <div className={projectStyles.metaListHeader}>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      <h2 className={projectStyles.titleJa}>{parse(post.title)}</h2>
                    </div>
                    <div className={projectStyles.metaItemChild}>
                      <div className={projectStyles.subTitleJa}>{post.projects.projectsSubtitleJa}</div>
                    </div>
                  </div>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      {post.categories.nodes && (
                        <ul className={projectStyles.catList}>
                          {post.categories.nodes.map((cat, index) => (
                            <li key={index}>{cat.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      <div className={projectStyles.date}>{post.date}</div>
                    </div>
                  </div>
                  <div className={projectStyles.metaItem}></div>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      <Star fill={fillColor} w={15} h={15} />
                    </div>
                  </div>
                </div>
                <div className={projectStyles.metaListFooter}>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      <h3 className={projectStyles.titleEn}>{post.projects.projectsTitleEn}</h3>
                    </div>
                    <div className={projectStyles.metaItemChild}>
                      <div className={projectStyles.subTitleEn}>{post.projects.projectsSubtitleEn}</div>
                    </div>
                  </div>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      {post.tags.nodes && (
                        <ul className={projectStyles.tagList}>
                          {post.tags.nodes.map((tags, index) => (
                            <li key={index}>{tags.name}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      {post.projects.projectsMediaCount && (
                        <div className={projectStyles.count}>[{post.projects.projectsMediaCount}]</div>
                      )}
                    </div>
                  </div>
                  <div className={projectStyles.metaItem}></div>
                  <div className={projectStyles.metaItem}>
                    <div className={projectStyles.metaItemChild}>
                      {post.projects.projectsMediaPower && (
                        <div className={projectStyles.power}>P{post.projects.projectsMediaPower}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </header>
            <div className={projectStyles.gallery}>
              <GalleryMarquee media={post.projects.projectsMedia} speed={post.projects.projectsGallerySpeed} />
            </div>
          </Link>
        </article>
      </div>
    ))
  ), [posts]);

  return (
    <section id="projects" className="projects">
      <div data-view={selectedValue} className={projectStyles.list} ref={menuRef}>
        {renderedPosts}
      </div>
    </section>
  );
});

export default Projects;
