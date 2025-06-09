import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, LogIn, Info } from "lucide-react";

export default function AdminLogin() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Edit className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h2>
            <p className="text-gray-600">Sign in with Google to manage your blog content</p>
          </div>
          
          <Button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-md transition-colors flex items-center justify-center font-medium"
          >
            <LogIn className="w-5 h-5 mr-3" />
            Continue with Google
          </Button>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Authentication Required</p>
                <p>Only authenticated users can access the admin panel.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
