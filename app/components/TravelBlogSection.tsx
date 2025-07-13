'use client';

import React, { useEffect, useState } from "react";
import Image from 'next/image';

interface BlogPost {
  id: number;
  title: string;
  description: string;
  url: string;
  cover_image: string;
  social_image: string;
  readable_publish_date: string;
  tag_list: string[];
  user: {
    name: string;
    profile_image: string;
  };
  reading_time_minutes: number;
}

const TravelBlogSection: React.FC = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        // Fetch travel-related posts from Dev.to API with more fields
        const response = await fetch(
          'https://dev.to/api/articles?tag=travel&top=3&per_page=3'
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch blog posts');
        }
        
        const data = await response.json();
        setPosts(data);
      } catch (err) {
        console.error('Error fetching blog posts:', err);
        setError('Failed to load blog posts. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // Fallback gradient backgrounds when no image is available
  const gradientBackgrounds = [
    'bg-gradient-to-br from-blue-500 to-purple-600',
    'bg-gradient-to-br from-amber-500 to-pink-600',
    'bg-gradient-to-br from-emerald-500 to-teal-600'
  ];

  if (isLoading) {
    return (
      <section className="max-w-5xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center">
          From Our Travel Blog
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow overflow-hidden animate-pulse">
              <div className="bg-gray-200 h-40 w-full"></div>
              <div className="p-5">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="max-w-5xl mx-auto py-12 px-4">
        <h2 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
          From Our Travel Blog
        </h2>
        <div className="text-center text-red-500">{error}</div>
      </section>
    );
  }

  return (
    <section className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-50 to-amber-50" />
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
      </div>
      
      <div className="text-center mb-16">
        <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          <span className="block bg-gradient-to-r from-[#FF8C00] to-[#FFA500] bg-clip-text text-transparent">
            Latest Travel Stories
          </span>
        </h2>
        <p className="mt-4 max-w-2xl text-xl text-gray-500 mx-auto">
          Discover inspiring travel experiences and expert tips from around the world
        </p>
      </div>
      
      <div className="max-w-3xl mx-auto space-y-8">
        {posts.map((post, index) => {
          const hasImage = post.cover_image || post.social_image;
          const bgGradient = gradientBackgrounds[index % gradientBackgrounds.length];
          
          return (
            <div 
              key={post.id} 
              className="relative group"
              onMouseEnter={() => setHoveredCard(index)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <a
                href={post.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`block rounded-2xl overflow-hidden shadow-lg transition-all duration-300 transform-gpu ${
                  hoveredCard === index ? 'scale-[1.02] shadow-xl' : 'scale-100'
                }`}
              >
                {/* Image/Gradient Background */}
                <div className={`relative h-64 ${!hasImage ? bgGradient : ''} overflow-hidden`}>
                  {hasImage && (
                    // Using regular img for dynamic URLs that can't be optimized by Next.js Image
                    <img
                      src={post.cover_image || post.social_image}
                      alt={post.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.parentElement?.classList.add(bgGradient);
                      }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300" />
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center space-x-2 mb-2">
                      {post.user?.profile_image && (
                        <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-white bg-white">
                          <img
                            src={post.user.profile_image}
                            alt={post.user.name}
                            width={32}
                            height={32}
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              // Fallback to a placeholder if the image fails to load
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-avatar.png';
                            }}
                          />
                        </div>
                      )}
                      <span className="text-sm font-medium text-white">
                        {post.user?.name || 'Travel Writer'}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Card Content */}
                <div className="bg-white p-8">
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tag_list.slice(0, 2).map((tag) => (
                      <span 
                        key={tag} 
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800"
                      >
                        {tag}
                      </span>
                    ))}
                    <span className="ml-auto text-xs text-gray-500 flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {post.reading_time_minutes || 5} min read
                    </span>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-orange-600 transition-colors">
                    {post.title}
                  </h3>
                  
                  <p className="text-gray-600 text-base mb-5 line-clamp-3">
                    {post.description.replace(/<[^>]+>/g, '')}
                  </p>
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      {post.readable_publish_date}
                    </span>
                    <span className="inline-flex items-center text-sm font-medium text-orange-600 group-hover:text-orange-700 transition-colors">
                      Read more
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </div>
                </div>
              </a>
            </div>
          );
        })}
      </div>
      
      <div className="mt-12 text-center">
        <a 
          href="https://dev.to/t/travel" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
        >
          View More Travel Stories
          <svg className="ml-2 -mr-1 w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </a>
      </div>
    </section>
  );
};

export default TravelBlogSection;
