import { NavLink, Route, Routes } from 'react-router';
import { HomePage } from './pages/HomePage';
import { CoursesPage } from './pages/CoursesPage';

export function App() {
  return (
    <>
      <nav className="nav">
        <NavLink to="/">Home</NavLink>
        <NavLink to="/courses">Courses</NavLink>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/courses" element={<CoursesPage />} />
        </Routes>
      </main>
    </>
  );
}
