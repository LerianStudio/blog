import { Link } from "wouter";
import { Github, Twitter, Linkedin } from "lucide-react";

export default function BlogFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-12">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <h5 className="text-lg font-semibold text-gray-900 mb-4">TechBlog</h5>
            <p className="text-gray-600 mb-4">
              A modern blog platform built with React and powered by a custom CMS.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Github className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-blue-600 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h6 className="font-semibold text-gray-900 mb-4">Quick Links</h6>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link href="/" className="hover:text-blue-600 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/posts" className="hover:text-blue-600 transition-colors">
                  All Posts
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-blue-600 transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/tags" className="hover:text-blue-600 transition-colors">
                  Tags
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h6 className="font-semibold text-gray-900 mb-4">Legal</h6>
            <ul className="space-y-2 text-gray-600">
              <li>
                <Link href="/privacy" className="hover:text-blue-600 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-blue-600 transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-600 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-200 mt-8 pt-8 text-center text-gray-600">
          <p>&copy; 2024 TechBlog. All rights reserved. Built with React + Custom CMS.</p>
        </div>
      </div>
    </footer>
  );
}
