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
import ResetPassword from "./pages/ResetPassword";
import DashboardRedirect from "./pages/DashboardRedirect";
import StudentDashboard from "./pages/student/StudentDashboard";
import StudentCourses from "./pages/student/StudentCourses";
import BrowseCourses from "./pages/student/BrowseCourses";
import StudentCourseDetail from "./pages/student/StudentCourseDetail";
import TakeQuiz from "./pages/student/TakeQuiz";
import Certificate from "./pages/student/Certificate";
import Badges from "./pages/student/Badges";
import Leaderboard from "./pages/student/Leaderboard";
import StudentCalendar from "./pages/student/StudentCalendar";
import StudentAssignmentDetail from "./pages/student/StudentAssignmentDetail";
import StudentAssignments from "./pages/student/StudentAssignments";
import StudentProfile from "./pages/student/Profile";
import StudentKits from "./pages/student/Kits";
import KitDetail from "./pages/student/KitDetail";
import StudentOrders from "./pages/student/Orders";
import TeacherDashboard from "./pages/teacher/TeacherDashboard";
import TeacherCourses from "./pages/teacher/TeacherCourses";
import CourseForm from "./pages/teacher/CourseForm";
import CourseDetail from "./pages/teacher/CourseDetail";
import QuizManager from "./pages/teacher/QuizManager";
import QuizQuestions from "./pages/teacher/QuizQuestions";
import QuizResults from "./pages/teacher/QuizResults";
import CourseResults from "./pages/teacher/CourseResults";
import AllQuizResults from "./pages/teacher/AllQuizResults";
import TeacherCalendar from "./pages/teacher/TeacherCalendar";
import TeacherAssignments from "./pages/teacher/TeacherAssignments";
import CourseAssignments from "./pages/teacher/CourseAssignments";
import AssignmentSubmissions from "./pages/teacher/AssignmentSubmissions";
import TeacherProfile from "./pages/teacher/Profile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminCourses from "./pages/admin/AdminCourses";
import AdminCalendar from "./pages/admin/AdminCalendar";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminStudyKits from "./pages/admin/AdminStudyKits";
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
            <Route path="/reset-password" element={<ResetPassword />} />
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
            <Route path="/student/leaderboard" element={
              <ProtectedRoute allowedRoles={['student']}>
                <Leaderboard />
              </ProtectedRoute>
            } />
            <Route path="/student/calendar" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentCalendar />
              </ProtectedRoute>
            } />
            <Route path="/student/assignments" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentAssignments />
              </ProtectedRoute>
            } />
            <Route path="/student/assignments/:id" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentAssignmentDetail />
              </ProtectedRoute>
            } />
            <Route path="/student/profile" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentProfile />
              </ProtectedRoute>
            } />
            <Route path="/student/kits" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentKits />
              </ProtectedRoute>
            } />
            <Route path="/student/kits/:id" element={
              <ProtectedRoute allowedRoles={['student']}>
                <KitDetail />
              </ProtectedRoute>
            } />
            <Route path="/student/orders" element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentOrders />
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
                <CourseResults />
              </ProtectedRoute>
            } />
            <Route path="/teacher/results" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AllQuizResults />
              </ProtectedRoute>
            } />
            <Route path="/teacher/calendar" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherCalendar />
              </ProtectedRoute>
            } />
            <Route path="/teacher/assignments" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherAssignments />
              </ProtectedRoute>
            } />
            <Route path="/teacher/courses/:id/assignments" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <CourseAssignments />
              </ProtectedRoute>
            } />
            <Route path="/teacher/assignments/:id/submissions" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <AssignmentSubmissions />
              </ProtectedRoute>
            } />
            <Route path="/teacher/profile" element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherProfile />
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
            <Route path="/admin/calendar" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminCalendar />
              </ProtectedRoute>
            } />
            <Route path="/admin/transactions" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminTransactions />
              </ProtectedRoute>
            } />
            <Route path="/admin/study-kits" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminStudyKits />
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
