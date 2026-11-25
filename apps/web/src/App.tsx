import { Navigate, Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { RequireAuthor } from './components/RequireAuthor';
import { HomePage } from './pages/HomePage';
import { CataloguePage } from './pages/learn/CataloguePage';
import { CoursePage } from './pages/learn/CoursePage';
import { LessonPage } from './pages/learn/LessonPage';
import { ManageCoursesPage } from './pages/manage/ManageCoursesPage';
import { EditCoursePage } from './pages/manage/EditCoursePage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CataloguePage />} />
        <Route path="courses/:courseId" element={<CoursePage />} />
        <Route path="courses/:courseId/lessons/:lessonId" element={<LessonPage />} />
        <Route
          path="manage"
          element={
            <RequireAuthor>
              <ManageCoursesPage />
            </RequireAuthor>
          }
        />
        <Route
          path="manage/courses/:courseId"
          element={
            <RequireAuthor>
              <EditCoursePage />
            </RequireAuthor>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
