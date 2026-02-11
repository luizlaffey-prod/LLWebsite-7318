import { Route, Switch } from "wouter";
import { Provider } from "./components/provider";
import { AuthProvider } from "./context/AuthContext";
import PreviewAuth from "./components/PreviewAuth";

// Pages
import Home from "./pages/index";
import About from "./pages/about";
import Services from "./pages/services";
import Portfolio from "./pages/portfolio";
import Originals from "./pages/originals";
import LuizLaffeysCollection from "./pages/originals/luiz-laffeys-collection";
import ZeroPointZero from "./pages/originals/zero-point-zero";
import Plans from "./pages/plans";
import Checkout from "./pages/checkout";
import Contact from "./pages/contact";
import Login from "./pages/login";
import Broadcasts from "./pages/broadcasts";
import SubscriptionSuccess from "./pages/subscription-success";
import AIVideoAds from "./pages/services/ai-video-ads";

function App() {
  return (
    <Provider>
      <PreviewAuth>
        <AuthProvider>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/about" component={About} />
            <Route path="/services" component={Services} />
            <Route path="/services/ai-video-ads" component={AIVideoAds} />
            <Route path="/portfolio" component={Portfolio} />
            <Route path="/originals" component={Originals} />
            <Route path="/originals/luiz-laffeys-collection" component={LuizLaffeysCollection} />
            <Route path="/originals/zero-point-zero" component={ZeroPointZero} />
            <Route path="/plans" component={Plans} />
            <Route path="/checkout" component={Checkout} />
            <Route path="/contact" component={Contact} />
            <Route path="/login" component={Login} />
            <Route path="/broadcasts" component={Broadcasts} />
            <Route path="/subscription-success" component={SubscriptionSuccess} />
            {/* Fallback to Home for unknown routes */}
            <Route component={Home} />
          </Switch>
        </AuthProvider>
      </PreviewAuth>
    </Provider>
  );
}

export default App;
