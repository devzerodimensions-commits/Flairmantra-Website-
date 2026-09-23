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

// The admin panel is the previous app, loaded (with its own stylesheet) only on /admin.
const LegacyAdmin = lazy(() => import('./legacy/LegacyApp'));

function Router() {
  const {route} = useStore();
  const path = route.split('?')[0].replace(/\/+$/, '') || '/';
  const [, first, second] = path.split('/');
  let page;
  if (path === '/') page = <Home/>;
  else if (path === '/shop') page = <Listing key="shop"/>;
  else if (first === 'category') page = <Listing key={second} slug={second}/>;
  else if (path === '/search') page = <Listing key="search" search/>;
  else if (first === 'product') page = <Product id={decodeURIComponent(second || '')}/>;
  else if (path === '/cart') page = <CartPage/>;
  else if (path === '/checkout') page = <CheckoutPage/>;
  else if (path === '/order-success') page = <OrderSuccess/>;
  else if (path === '/account') page = <AccountPage/>;
  else if (path === '/wishlist') page = <WishlistPage/>;
  else if (path === '/track-order') page = <TrackOrderPage/>;
  else if (path === '/about') page = <AboutPage/>;
  else if (path === '/contact') page = <ContactPage/>;
  else if (path === '/shipping-returns') page = <ShippingPage/>;
  else page = <CmsPage slug={path.slice(1)}/>;
  return <Shell>{page}</Shell>;
}

const root = createRoot(document.getElementById('root'));
if (location.pathname.startsWith('/admin')) {
  document.documentElement.classList.add('fm-admin');
  root.render(<Suspense fallback={null}><LegacyAdmin/></Suspense>);
} else {
  root.render(<StoreProvider><Router/></StoreProvider>);
}
