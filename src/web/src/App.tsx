import { ClaimDetail } from './features/claims/ClaimDetail';
import { ClaimsList } from './features/claims/ClaimsList';
import { NewClaimForm } from './features/claims/NewClaimForm';
import { routes, useRoute, type Route } from './routing';

export function App() {
  const route = useRoute();
  const onClaims = route.name === 'claims' || route.name === 'claim';

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <div className="brand">
            <span className="brand__name">ClaimsDesk</span>
            <span className="brand__subtitle">Contoso Insurance - demo data</span>
          </div>
          <nav aria-label="Main">
            <ul className="nav">
              <li>
                <a href={routes.claims} aria-current={onClaims ? 'page' : undefined}>
                  Claims
                </a>
              </li>
              <li>
                <a href={routes.newClaim} aria-current={route.name === 'new' ? 'page' : undefined}>
                  New claim
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>
      <main className="app-main">{renderRoute(route)}</main>
    </>
  );
}

function renderRoute(route: Route) {
  switch (route.name) {
    case 'claims':
      return <ClaimsList />;
    case 'claim':
      return <ClaimDetail key={route.claimId} claimId={route.claimId} />;
    case 'new':
      return <NewClaimForm />;
    case 'not-found':
      return (
        <section aria-labelledby="not-found-heading">
          <h1 id="not-found-heading">Page not found</h1>
          <p>
            <a href={routes.claims}>Go to the claims list</a>
          </p>
        </section>
      );
  }
}
