import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Edit } from "lucide-react";

export default function BlogHeader() {
  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <h1 className="text-2xl font-bold text-gray-900 cursor-pointer">TechBlog</h1>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-700 hover:text-blue-600 transition-colors">
                Home
              </Link>
              <Link href="/posts" className="text-gray-700 hover:text-blue-600 transition-colors">
                Posts
              </Link>
              <Link href="/about" className="text-gray-700 hover:text-blue-600 transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-gray-700 hover:text-blue-600 transition-colors">
                Contact
              </Link>
            </nav>
          </div>
          <div className="flex items-center space-x-4">
            <button className="md:hidden p-2 rounded-md hover:bg-gray-100">
              <Menu className="w-5 h-5 text-gray-700" />
            </button>
            <Link href="/admin">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                <Edit className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
