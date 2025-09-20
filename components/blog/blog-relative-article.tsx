"use client";

import { getBlogs } from "@/sanity/lib/blogs";
import React, { useEffect, useState } from "react";
import BlogCard from "./blog-card";

interface Posts {
  items: Post[];
  total: number;
}
interface Post {
  title: string;
  slug: {
    current: string;
  };
  author: {
    image: {
      url: string;
    };
    name: string;
  };
  publishedAt: string;
  mainImage: any;
  categories: {
    title: string;
  }[];
}

function BlogRelativeArticles({ slugToExclude }: { slugToExclude?: string }) {
  const [posts, setPosts] = useState<Posts>({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  const fetchPosts = async () => {
    setLoading(true);

    try {
      const fetchedPosts = await getBlogs({
        limit: 4,
      });

      if (slugToExclude) {
        fetchedPosts.items = fetchedPosts.items.filter(
          (post: any) => post.slug.current !== slugToExclude
        );
      } else {
        fetchedPosts.items = fetchedPosts.items.slice(0, 3);
      }

      setPosts(fetchedPosts);
    } catch (err) {
      console.error("Erreur lors du chargement des articles :", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  return (
    <div className="space-y-4 md:space-y-0 md:flex items-stretch gap-8">
      {posts.items.map((post) => (
        <BlogCard
          key={post.slug.current}
          title={post.title}
          slug={post.slug.current}
          mainImage={post.mainImage}
          author={post.author}
          categories={post.categories}
          publishedAt={post.publishedAt}
        />
      ))}
    </div>
  );
}

export default BlogRelativeArticles;
