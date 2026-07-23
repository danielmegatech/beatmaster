import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <Helmet>
        <title>Página não encontrada — BeatMaster</title>
        <meta
          name="description"
          content="A página que você procura não existe no BeatMaster. Volte ao metrônomo, setlist e sampler."
        />
        <meta property="og:title" content="Página não encontrada — BeatMaster" />
        <meta
          property="og:description"
          content="A página que você procura não existe no BeatMaster. Volte ao metrônomo, setlist e sampler."
        />
        <meta name="twitter:title" content="Página não encontrada — BeatMaster" />
        <meta
          name="twitter:description"
          content="A página que você procura não existe no BeatMaster."
        />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <main className="flex min-h-screen items-center justify-center bg-muted">
        <div className="text-center">
          <h1 className="mb-4 text-4xl font-bold">404</h1>
          <p className="mb-4 text-xl text-muted-foreground">Oops! Página não encontrada</p>
          <a href="/" className="text-primary underline hover:text-primary/90">
            Voltar para o início
          </a>
        </div>
      </main>
    </>
  );
};

export default NotFound;
