import React, { useContext, useMemo, useRef, useState, useEffect, Suspense } from "react";
import { useIntersection, useDebounce } from "react-use";
import { ProjectsContext } from '../contexts/ProjectsContext';
import { Link } from 'gatsby';
import { GatsbyImage } from 'gatsby-plugin-image';

/** vimeo player */
import VimeoPlayer from '@vimeo/player';
import { Splide, SplideSlide } from '@splidejs/react-splide';
import { AutoScroll } from "@splidejs/splide-extension-auto-scroll";
import '@splidejs/react-splide/css';

import { Pixelify } from "react-pixelify";
import parse from 'html-react-parser';
import * as projectStyles from '../css/components/project.module.scss';
import { useSelectedValue } from '../contexts/SelectedValueContext';
import Marquee from 'react-fast-marquee';
import Star from "./star";
import useScrollableMenu from './useScrollableMenu';
import { get, set } from "lodash";
const fillColor = '#c9171e';


const getVimeoThumbnail = async (videoId) => {
  const response = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`);
  const data = await response.json();
  return data.thumbnail_url; // サムネイルのURLを返す
};

const PixelPhoto = React.memo(({ src, onRemove }) => {
  const [pixelSize, setPixelSize] = useState(50); // 初期状態を50に設定
  const [hasIntersected, setHasIntersected] = useState(false);
  const intersectionRef = useRef(null);
  const intersection = useIntersection(intersectionRef, {
    root: null,
    rootMargin: '0px',
    threshold: .95 // 要素が完全にビューポートに入る前にアニメーションを開始
  });

  useEffect(() => {
    if (intersection && intersection.isIntersecting) {
      setHasIntersected(true); // 交差したことを記録
      const pixelationSequence = [
        { size: 30, delay: 100 },
        { size: 15, delay: 150 },
        { size: 0, delay: 200 },
      ];

      pixelationSequence.forEach(({ size, delay }) => {
        setTimeout(() => {
          setPixelSize(size);
          if (size === 0) {
            //onRemove();
          }
        }, delay);
      });

    } else {
      // ビューポートに入る前に初期状態にリセット
      setPixelSize(50);
    }
  }, [intersection, hasIntersected, onRemove]);

  return (
    <div ref={intersectionRef} className={projectStyles.pixel}>
      <Pixelify
        src={src}
        width={250}
        height={250}
        centered={true}
        pixelSize={pixelSize}
      />
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.src === nextProps.src && prevProps.onRemove === nextProps.onRemove;
});


/**
 *  Vimeoコンポーネント
 */
const vimeoPlayers = (() => {
  const _players = {
    // videoId: player
  };
  const m = {
    prepare: (videoId) => {
      const dom = document.createElement('div');
      dom.classList.add('vimeo-player');
      dom.style.width = '100%';
      dom.style.height = '100%';
      const player = new VimeoPlayer(dom, {
        id: videoId,
        loop: true,
        title: false,
        byline: false,
        portrait: false,
        controls: false,
        muted: true,
        autopause: false,
        quality: '360p',
        background: true,
      });
      _players[videoId] = {
        player,
        dom,
        playerOnPlay: (callback) => {
          player.on('play', callback)
        }
      }
      player.on('loaded', () => {
        player.setVolume(0);
        player.play();
      });
    },
    get: (videoId, div) => {
      // if (!_players[videoId]) {
        m.prepare(videoId, div);
      // }
      return _players[videoId];
    }
  }
  return m;
})()
const Vimeo = ({ videoId, onPlay=()=>{}}) => {
  // return (
  //   <iframe
  //     src={`https://player.vimeo.com/video/${videoId}?autoplay=1&loop=1&title=0&byline=0&portrait=0&controls=0&muted=1&autopause=0`}
  //     title=""
  //     //loading="lazy"
  //     frameBorder="0"
  //     allow="autoplay;"
  //     style={{
  //       pointerEvents: 'none',
  //       width: '100%',
  //       height: '100%',
  //       objectFit: 'cover',
  //       objectPosition: 'center',
  //     }}
  //   ></iframe>
  // );
  const ref = useRef(null);
  useEffect(() => {
    const {dom, playerOnPlay} = vimeoPlayers.get(videoId);
    playerOnPlay(onPlay);
    ref.current.appendChild(dom);
  }, []);

  return (
    <div
      style={{
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
      ref={ref}
    ></div>
  )
}

const Mosic = React.forwardRef(({ src, onLoaded=()=>{}, style={} }, ref) => {
  const [pixelSize, setPixelSize] = useState(50);
  useEffect(() => {
    const pixelationSequence = [
      { size: 30, delay: 100 },
      { size: 15, delay: 150 },
      { size: 0, delay: 200 },
    ];
    const timeouts = [];
    pixelationSequence.forEach(({ size, delay }) => {
      timeouts.push(
        setTimeout(() => {
          setPixelSize(size)
          if (size === 0) {
            setTimeout(() => {
              onLoaded();
            }, 300);
          }
        }, delay )
      );
    })
    return () => {
      timeouts.forEach((timeout) => {
        clearTimeout(timeout);
      })
    }
  }, []);
  if (!src) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={projectStyles.pixel}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 2,
        ...style,
      }}
    >
      <Pixelify
        src={src}
        width={250}
        height={250}
        centered={true}
        pixelSize={pixelSize}
      />
    </div>
  );
})

const Thumbnail = ({ media, aspectRatio }) => {
  const [state, setState] = useState({
    thumbnail: media.src,
    loadingState: media.type === 'photo' ? 'thumbnailLoaded' : 'loading',
  });
  const ref = useRef(null);
  const mosicRef = useRef(null);
  const mediaRef = useRef(null);
  useEffect(() => {
    if ( media.type === 'video' ) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
              fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${media.id}`)
                .then(response => response.json())
                .then(data => {
                  setState({
                    loadingState: 'thumbnailLoaded',
                    thumbnail: data.thumbnail_url,
                    intersectionOnce: true,
                  });
                });
              observer.disconnect();
          }
        });
      }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1,
      });
      observer.observe(ref.current);
      return () => {
        observer.disconnect();
      }
      // fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${media.id}`)
      //   .then(response => response.json())
      //   .then(data => {
      //     setState({
      //       loadingState: 'thumbnailLoaded',
      //       thumbnail: data.thumbnail_url,
      //     });
      //   });
    }
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        aspectRatio: aspectRatio,
      }}
      className={projectStyles.media}
    >
      { state.loadingState === 'thumbnailLoaded' && (
        <Mosic
          src={state.thumbnail}
          ref={mosicRef}
          onLoaded={() => {
            setTimeout(() => {
              if (mosicRef.current) {
                mosicRef.current.style.opacity = 0;
                mediaRef.current.style.opacity = 1;
              }
            }, 3000);
          }}
        />
      )}
      <div ref={mediaRef} style={{
        width: '100%',
        height: '100%',
        opacity: 0,
      }}>
      { media.type === 'photo' && (
          <img
            src={media.src}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }}
            alt={media.alt}
          />
        )
      }
      { media.type === 'video' && (
          <Vimeo 
            videoId={media.id}
            onPlay={() => {
              if (mosicRef.current) {
                mosicRef.current.style.opacity = 0;
                mediaRef.current.style.opacity = 1;
              }
            }}
          />
        )
      }
      </div>
    </div>
  )
}
const Marquee2 = ({ media, speed, children }) => {
  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        position: 'relative',
        display: 'flex',
        flexWrap: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          animation: `marquee ${speed}s linear infinite`,
        }}
      >
      {children}
      </div>
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          animation: `marquee ${speed}s linear infinite`,
        }}
        aria-hidden="true"
      >
      {children}
      </div>
    </div>
  )
}


const GalleryMarquee = React.memo(({ media, speed }) => {
  // const [thumbnails, setThumbnails] = useState({});
  // const [showPixelPhoto, setShowPixelPhoto] = useState(true);

  // const handleRemovePixelPhoto = () => {
  //   setShowPixelPhoto(false);
  // };

  // useEffect(() => {
  //   const fetchThumbnails = async () => {
  //     const newThumbnails = {};
  //     for (const item of media) {
  //       if (item.mediaCheck === 'video' && item.shortVideo) {
  //         const thumbnail = await getVimeoThumbnail(item.shortVideo);
  //         newThumbnails[item.shortVideo] = thumbnail;
  //       }
  //     }
  //     setThumbnails(newThumbnails);
  //   };
  //   fetchThumbnails();
  // }, [media]);
  return (
    <Marquee2 speed={speed} autoFill={true}>
      {
        media.map((item, index) => {
          const media = {
            type: item.mediaCheck,
          }
          if (item.mediaCheck === 'photo') {
            media.alt = item.photo.node.altText || 'デフォルトのサイト名'
            media.src = item.photo.node.localFile.childImageSharp.original.src
          } else if (item.mediaCheck === 'video') {
            media.id = item.shortVideo;
          }

          return (item.viewCheck === 'view1' || item.viewCheck === 'view3') && (
            <div className={projectStyles.item} key={index}>
              <Thumbnail media={media} aspectRatio={item.aspectRatio} />
              {/*
              {item.mediaCheck === 'photo' && item.photo && (
                <div style={{ width: '100%', height: '100%', position: 'relative' }} className={projectStyles.media}>
                  <div className={projectStyles.photo}>

                    <GatsbyImage
                      image={item.photo.node.localFile.childImageSharp.gatsbyImageData}
                      style={{ width: '100%', height: '100%' }}
                      alt={item.photo.node.altText || 'デフォルトのサイト名'} />
                    {showPixelPhoto && <PixelPhoto src={item.photo.node.localFile.childImageSharp.original.src} onRemove={handleRemovePixelPhoto} />}
                  </div>
                </div>
              )}
              {item.mediaCheck === 'video' && item.shortVideo && (
                <div style={{ width: '100%', height: '100%', position: 'relative' }} className={projectStyles.media}>
                  <div className={projectStyles.video} style={{ aspectRatio: item.aspectRatio }}>
                    <Vimeo videoId={item.shortVideo} />
                    {showPixelPhoto && <PixelPhoto src={thumbnails[item.shortVideo]} onRemove={handleRemovePixelPhoto} />}
                  </div>
                </div>
              )}
              */}
            </div>
          )
        })
      }
    </Marquee2>
  );
})



const Projects = React.memo(() => {
  const { selectedValue } = useSelectedValue();
  const posts = useContext(ProjectsContext);

  const menuRef = useRef(null);
  const itemsRef = useRef([]);
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
