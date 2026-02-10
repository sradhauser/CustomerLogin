import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import Loader from "./Loader1";

const RouteLoader = ({ children }) => {
  const location = useLocation();
  const isFirstLoad = useRef(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // ⛔ Skip first render (startup loader already shown)
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    setLoading(true);

    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <>
      {children}
      {loading && <Loader />}
    </>
  );
};

export default RouteLoader;
