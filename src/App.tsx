import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import SchedulePage from "@/pages/Schedule";
import BookingPage from "@/pages/Booking";
import ConflictPage from "@/pages/Conflict";

export default function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<SchedulePage />} />
          <Route path="/booking" element={<BookingPage />} />
          <Route path="/conflict" element={<ConflictPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}
