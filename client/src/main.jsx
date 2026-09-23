import React, {Suspense, lazy} from 'react';
import {createRoot} from 'react-dom/client';
import './storefront/storefront.css';
import {StoreProvider, useStore} from './storefront/store';
import {Shell} from './storefront/layout';
import Home from './storefront/pages/Home';
import Listing from './storefront/pages/Listing';
import Product from './storefront/pages/Product';
import {CartPage, CheckoutPage, OrderSuccess} from './storefront/pages/Checkout';
import {AccountPage, WishlistPage, TrackOrderPage} from './storefront/pages/Account';
import {AboutPage, ContactPage, ShippingPage, CmsPage} from './storefront/pages/Info';
import {PageSections, usePageLayout} from './storefront/sections';

const BuilderPreview = lazy(() => import('./storefront/preview'));
const PageBuilder = lazy(() => import('./builder/Builder'));

// Pages designed in the admin page builder: 'replace' swaps the built-in page for the
// designed sections; 'above' shows them above the built-in content (shop and categories).
function Designed({pageKey, mode = 'replace', children}) {
  const layout = usePageLayout(pageKey);
  if (!layout) return children;
  return <>{<PageSections blocks={layout.blocks}/>}{mode === 'above' && children}</>;
}

// The admin panel is the previous app, loaded (with its own stylesheet) only on /admin.
const LegacyAdmin = lazy(() => import('./legacy/LegacyApp'));

function Router() {
  const {route} = useStore();
  const path = route.split('?')[0].replace(/\/+$/, '') || '/';
  const [, first, second] = path.split('/');
  let page;
  if (path === '/__preview') page = <Suspense fallback={null}><BuilderPreview/></Suspense>;
  else if (path === '/') page = <Designed pageKey="home"><Home/></Designed>;
  else if (path === '/shop') page = <Designed pageKey="shop" mode="above"><Listing key="shop"/></Designed>;
  else if (first === 'category') page = <Designed key={second} pageKey={`category-${second}`} mode="above"><Listing key={second} slug={second}/></Designed>;
  else if (path === '/search') page = <Listing key="search" search/>;
  else if (first === 'product') page = <Product id={decodeURIComponent(second || '')}/>;
  else if (path === '/cart') page = <CartPage/>;
  else if (path === '/checkout') page = <CheckoutPage/>;
  else if (path === '/order-success') page = <OrderSuccess/>;
  else if (path === '/account') page = <AccountPage/>;
  else if (path === '/wishlist') page = <WishlistPage/>;
  else if (path === '/track-order') page = <TrackOrderPage/>;
  else if (path === '/about') page = <Designed pageKey="about"><AboutPage/></Designed>;
  else if (path === '/contact') page = <Designed pageKey="contact"><ContactPage/></Designed>;
  else if (path === '/shipping-returns') page = <Designed pageKey="shipping-returns"><ShippingPage/></Designed>;
  else page = <Designed key={path} pageKey={`custom-${path.slice(1)}`}><CmsPage slug={path.slice(1)}/></Designed>;
  return <Shell>{page}</Shell>;
}

const root = createRoot(document.getElementById('root'));
if (location.pathname.startsWith('/admin/builder')) {
  // The page builder runs outside the admin panel's stylesheet, like Elementor's full-screen editor.
  root.render(<Suspense fallback={null}><PageBuilder/></Suspense>);
} else if (location.pathname.startsWith('/admin')) {
  document.documentElement.classList.add('fm-admin');
  root.render(<Suspense fallback={null}><LegacyAdmin/></Suspense>);
} else {
  root.render(<StoreProvider><Router/></StoreProvider>);
}
