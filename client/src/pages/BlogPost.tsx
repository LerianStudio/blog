import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import BlogHeader from "@/components/BlogHeader";
import BlogFooter from "@/components/BlogFooter";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowLeft, User } from "lucide-react";
import type { Post } from "@shared/schema";

export default function BlogPost() {
  const params = useParams();
  const slug = params.slug;

  const { data: post, isLoading, error } = useQuery<Post>({
    queryKey: [`/api/posts/${slug}`],
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

  if (error || !post) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BlogHeader />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The post you're looking for doesn't exist or has been removed.</p>
          <Link href="/">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BlogHeader />
      
      <article className="max-w-4xl mx-auto px-4 py-16">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Post Header */}
        <header className="mb-12">
          <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
            {post.category && (
              <Badge variant="secondary">{post.category}</Badge>
            )}
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>{new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>5 min read</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="text-xl text-gray-600 leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </header>

        {/* Post Content */}
        <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
          <MarkdownRenderer content={post.content} />
        </div>

        {/* Post Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Tags:</h3>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Author Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center mr-4">
              <User className="w-6 h-6 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Blog Author</p>
              <p className="text-sm text-gray-600">Published on {new Date(post.publishedAt || post.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </article>

      <BlogFooter />
    </div>
  );
}
