import React, { useContext, useMemo, useRef, useState, useEffect, Suspense } from "react";
import { useIntersection, useDebounce } from "react-use";
import { ProjectsContext } from '../contexts/ProjectsContext';
import { Link } from 'gatsby';
import { GatsbyImage } from 'gatsby-plugin-image';

/** vimeo player */
import VimeoPlayer from '@vimeo/player';

import { Pixelify } from "react-pixelify";
import parse from 'html-react-parser';
import * as projectStyles from '../css/components/project.module.scss';
import { useSelectedValue } from '../contexts/SelectedValueContext';
import Marquee from 'react-fast-marquee';
import Star from "./star";
import useScrollableMenu from './useScrollableMenu';
import _ from "lodash";
const fillColor = '#c9171e';


const Vimeo = ({ videoId, onPlay=()=>{}, withFallback=true}) => {
  const ref = useRef(null);
  const fallbackRef = useRef(null);
  useEffect(() => {
    if (!ref.current) {
      return
    }
    const player = new VimeoPlayer(ref.current, {
      id: videoId,
      loop: true,
      title: false,
      byline: false,
      portrait: false,
      controls: false,
      muted: true,
      autopause: false,
      quality: '360p',
      // background: true,
    });
    player.setVolume(0);
    player.on('loaded', () => {
      player.play();
      if (fallbackRef.current) {
        fallbackRef.current.style.display = 'none';
      }
    });
    player.on('play', () => {
      onPlay();
    });
  }, []);

  return (
    <div
      ref={ref}
      className="vimeo-player"
      style={{
        pointerEvents: 'none',
        width: '100%',
        height: '100%',
        position: 'relative',
      }}
    >
      {
        withFallback && (
          <VimeoFallback videoId={videoId} ref={fallbackRef} />
        )
      }
    </div>
  )
}
const VimeoFallback = React.forwardRef(({ videoId }, ref)  => {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${videoId}`)
      .then(response => response.json())
      .then(data => {
        setSrc(data.thumbnail_url);
      });
  }, []);

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    >
      {src && (
        <Mosic src={src} />
      )}
    </div>
  )
})

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
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        aspectRatio: aspectRatio,
      }}
      className={projectStyles.media}
    >
      <div style={{
        width: '100%',
        height: '100%',
      }}>
      { media.type === 'photo' && (
        <div className={projectStyles.photo}>
          <GatsbyImage
            image={media.src}
            style={{ width: '100%', height: '100%', aspectRatio: aspectRatio }}
            alt={media.alt}
          />
        </div>
        )
      }
      { media.type === 'video' && (
          <Vimeo 
            videoId={media.id}
            onPlay={() => {
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
  return (
    <Marquee speed={speed} autoFill={true}>
      {
        media.map((item, index) => {
          const media = {
            type: item.mediaCheck,
          }
          if (item.mediaCheck === 'photo') {
            media.alt = item.photo.node.altText || 'デフォルトのサイト名'
            media.src = item.photo.node.localFile.childImageSharp.gatsbyImageData
          } else if (item.mediaCheck === 'video') {
            media.id = item.shortVideo;
          }

          return (item.viewCheck === 'view1' || item.viewCheck === 'view3') && (
            <div className={projectStyles.item} key={index}>
              <Thumbnail media={media} aspectRatio={item.aspectRatio} />
            </div>
          )
        })
      }
    </Marquee>
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
