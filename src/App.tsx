import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect, Component, type ReactNode } from "react";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Profile from "@/pages/Profile";
import Materials from "@/pages/Materials";
import Assignments from "@/pages/Assignments";
import AIParse from "@/pages/AIParse";
import LiveRoom from "@/pages/LiveRoom";
import TeacherLive from "@/pages/TeacherLive";
import { useStore } from "@/store";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
          <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">!</span>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">页面出现错误</h2>
            <p className="text-sm text-gray-500 mb-4">{this.state.error?.message || '未知错误'}</p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const { preferences } = useStore();

  useEffect(() => {
    document.documentElement.classList.remove('theme-light', 'theme-cyber');
    if (preferences.theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else if (preferences.theme === 'cyber') {
      document.documentElement.classList.add('theme-cyber');
    }
  }, [preferences.theme]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/ai-parse" element={<AIParse />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
          {/* 直播页面 - 独立布局 */}
          <Route path="/live" element={<LiveRoom />} />
          <Route path="/teacher-live" element={<TeacherLive />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
