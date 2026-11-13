import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import GoogleCallback from "./pages/GoogleCallback";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import ProtectedRoute from "./routes/ProtectedRoute";
import CreateDeck from "./pages/CreateDeck";
import DeckDetails from "./pages/DeckDetails";
import CreateCard from "./pages/CreateCard";
import StudyMode from "./pages/StudyMode";
import StudySession from "./pages/StudySession";

function InitialRedirect() {
  return <Navigate to={localStorage.getItem("token") ? "/dashboard" : "/login"} replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<InitialRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route path="/auth/google/return" element={<GoogleCallback />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/new"
          element={
            <ProtectedRoute>
              <CreateDeck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId"
          element={
            <ProtectedRoute>
              <DeckDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId/cards/new"
          element={
            <ProtectedRoute>
              <CreateCard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId/study"
          element={
            <ProtectedRoute>
              <StudyMode />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId/study/:mode"
          element={
            <ProtectedRoute>
              <StudySession />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
export default App;
