import { LandingPage } from "./pages/LandingPage";
import { ThemeToggle } from "./components/ThemeToggle";
import "./App.css";

function App() {
  return (
    <div className="app">
      <ThemeToggle />
      <LandingPage />
    </div>
  );
}

export default App;
