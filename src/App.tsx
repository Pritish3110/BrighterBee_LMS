import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DashboardRedirect from "./pages/DashboardRedirect";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import BrowseCourses from "./pages/student/BrowseCourses";
import StudentCourseDetail from "./pages/student/StudentCourseDetail";
import TakeQuiz from "./pages/student/TakeQuiz";
import Certificate from "./pages/student/Certificate";
import Badges from "./pages/student/Badges";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCourses from "./pages/teacher/TeacherCourses";
import CourseForm from "./pages/teacher/CourseForm";
import CourseDetail from "./pages/teacher/CourseDetail";
import QuizManager from "./pages/teacher/QuizManager";
import QuizQuestions from "./pages/teacher/QuizQuestions";
import QuizResults from "./pages/teacher/QuizResults";
import AllQuizResults from "./pages/teacher/AllQuizResults";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCourses from "./pages/admin/AdminCourses";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardRedirect />
                </ProtectedRoute>
              }
            />
            
            {/* Student Routes */}
            <Route path="/student" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/courses" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCourses />
              </ProtectedRoute>
            } />
            <Route path="/student/browse" element={
              <ProtectedRoute allowedRoles={['student']}>
                <BrowseCourses />
              </ProtectedRoute>
            } />
            <Route path="/student/courses/:id" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/student/quiz/:quizId" element={
              <ProtectedRoute allowedRoles={['student']}>
                <TakeQuiz />
              </ProtectedRoute>
            } />
            <Route path="/student/certificate/:courseId" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Certificate />
              </ProtectedRoute>
            } />
            <Route path="/student/badges" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Badges />
              </ProtectedRoute>
            } />
            
            {/* Teacher Routes */}
            <Route path="/teacher" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherCourses />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/new" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CourseForm />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/:id" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CourseDetail />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/:id/edit" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CourseForm />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/:courseId/quizzes" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizManager />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/:courseId/quizzes/:quizId" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizQuestions />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/:courseId/quizzes/:quizId/results" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizResults />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/:courseId/results" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizResults />
              </ProtectedRoute>
            } />
            <Route path="/teacher/results" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AllQuizResults />
              </ProtectedRoute>
            } />
            
            {/* Admin Routes */}
            <Route path="/admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="/admin/analytics" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminAnalytics />
              </ProtectedRoute>
            } />
            <Route path="/admin/courses" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCourses />
              </ProtectedRoute>
            } />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
