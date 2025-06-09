import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import BlogHeader from "@/components/BlogHeader";
import BlogFooter from "@/components/BlogFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight, BookOpen, Rss } from "lucide-react";
import type { Post } from "@shared/schema";

export default function Blog() {
  const { data: posts, isLoading } = useQuery<Post[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BlogHeader />
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  const featuredPosts = posts?.slice(0, 3) || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogHeader />
      
      {/* Hero Section */}
      <section className="bg-white py-16">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Welcome to TechBlog
          </h2>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Explore the latest in technology, development, and innovation. 
            Built with React and powered by our custom CMS.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Read Latest Posts
            </Button>
            <Button variant="outline">
              <Rss className="w-4 h-4 mr-2" />
              Subscribe
            </Button>
          </div>
        </div>
      </section>

      {/* Featured Posts */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-3xl font-bold text-gray-900">Latest Posts</h3>
            <Link href="/posts" className="text-blue-600 hover:text-blue-700 font-medium">
              View all posts <ArrowRight className="w-4 h-4 ml-1 inline" />
            </Link>
          </div>
          
          {featuredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No posts published yet.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredPosts.map((post) => (
                <Card key={post.slug} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center text-sm text-gray-500 mb-3">
                      <Calendar className="w-4 h-4 mr-1" />
                      <span>{new Date(post.publishedAt || post.createdAt || new Date()).toLocaleDateString()}</span>
                      <span className="mx-2">•</span>
                      <Clock className="w-4 h-4 mr-1" />
                      <span>5 min read</span>
                    </div>
                    <Link href={`/posts/${post.slug}`}>
                      <h4 className="text-xl font-semibold text-gray-900 mb-3 hover:text-blue-600 cursor-pointer">
                        {post.title}
                      </h4>
                    </Link>
                    <p className="text-gray-600 mb-4">
                      {post.excerpt || post.content.substring(0, 150) + "..."}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        {post.category && (
                          <Badge variant="secondary">{post.category}</Badge>
                        )}
                      </div>
                      <Link href={`/posts/${post.slug}`}>
                        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
                          Read more <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <BlogFooter />
    </div>
  );
}
