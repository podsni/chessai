import { TabSystem } from "./components/TabSystem";
import { ErrorBoundary } from "./components/ErrorBoundary";

function App() {
  return (
    <ErrorBoundary>
      <div className="App">
        <TabSystem />
      </div>
    </ErrorBoundary>
  );
}

export default App;
