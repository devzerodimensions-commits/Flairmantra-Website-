const images = {
  women: '/social/flairmantra-tradition-orange.jpeg',
  festive: '/images/navratri-chaniya-choli.png',
  bridal: '/images/wedding-bridal.png',
  men: '/images/men-emerald-sherwani.png',
  fusion: '/social/flairmantra-white-navratri.jpeg',
  accessories: '/images/accessories/kundan-necklace.jpg'
};

const product = (id, name, category, subcategory, fabric, colors, sizes, price, details, image, badge='') => ({
  id, name, category, subcategory, collections:[category], brand:'FlairMantra', fabric,
  colors:colors.split(', '), sizes:sizes.split('-'), price, details, image, badge,
  attributes:{colors:colors.split(', ')}, stock:25, status:'active'
});

export const clientCatalog = {
  categories:[
    {id:'women',name:'Women',subtitle:'Ethnic essentials & occasion wear',image:images.women},
    {id:'men',name:'Men',subtitle:'Kurtas, sherwanis & refined layers',image:images.men},
    {id:'festive-edit',name:'Festive Edit',subtitle:'Celebration-ready statement styles',image:images.festive},
    {id:'fusion-wear',name:'Fusion Wear',subtitle:'Indian craft, contemporary silhouettes',image:images.fusion},
    {id:'accessories',name:'Accessories',subtitle:'The finishing touch',image:images.accessories}
  ],
  products:[
    {...product('fm-wk-01','FlairMantra Classic Cotton Kurta','Women','Kurtas & Tunics','100% Cotton','Mustard, Teal, Rust','XS-S-M-L-XL-2XL-3XL-4XL',39.99,'Straight cut, side slits, mandarin collar','/images/catalog/mustard-kurta.png','New'),productType:'variable',variationImages:[{color:'Mustard',image:'/images/catalog/mustard-kurta.png'},{color:'Teal',image:'/images/catalog/mustard-kurta-teal.png'},{color:'Rust',image:'/images/catalog/mustard-kurta-rust.png'}]},
    product('fm-wk-02','Anarkali Festive Kurta','Women','Kurtas & Tunics','Rayon Silk Blend','Maroon, Navy, Emerald','XS-S-M-L-XL-2XL-3XL',64.99,'Flared silhouette, thread embroidery, full sleeves','/social/flairmantra-tradition-orange.jpeg','New'),
    product('fm-wk-03','Embroidered A-Line Kurta','Women','Kurtas & Tunics','Georgette','Peach, Lavender, Ivory','XS-S-M-L-XL-2XL',54.50,'Sequin work on yoke, three-quarter sleeves','/social/flairmantra-grey-navratri.jpeg'),
    product('fm-wk-04','Linen Blend Asymmetric Kurta','Women','Kurtas & Tunics','Linen-Cotton','Olive, Beige, Charcoal','XS-S-M-L-XL-2XL-3XL-4XL',47.00,'High-low hem, button placket, relaxed fit','/social/flairmantra-orange-full.jpeg'),
    product('fm-ws-01','Banarasi Silk Saree','Women','Sarees','Pure Banarasi Silk','Gold, Magenta, Royal Blue','One Size',129.00,'Zari border, traditional pallu, includes blouse piece','/images/women-blue-banarasi-saree.png','New'),
    product('fm-ws-02','Chanderi Cotton Silk Saree','Women','Sarees','Chanderi Silk','Pastel Pink, Mint, Mustard','One Size',89.50,'Lightweight, subtle gold dots, breathable','/images/catalog/blush-chanderi-saree.png'),
    product('fm-ws-03','Organza Handloom Saree','Women','Sarees','Organza','White, Coral, Sky Blue','One Size',74.99,'Sheer texture, floral resham work, unstitched','/images/wedding-bridal.png'),
    product('fm-ws-04','Pre-Stitched Georgette Saree','Women','Sarees','Georgette','Black, Wine, Teal','XS-S-M-L-XL-2XL',69.00,'Pleated and pinned, easy drape, no safety pins needed','/images/navratri-chaniya-choli.png'),
    {...product('fm-wl-01','Zardozi Bridal Lehenga','Festive Edit','Lehenga Cholis','Silk Velvet','Deep Red, Burgundy, Navy','XS-S-M-L-XL-2XL',349.00,'Heavy zardozi work, full flare, included dupatta','/images/wedding-bridal.png','New'),collections:['Women','Festive Edit']},
    {...product('fm-wl-02','Mirror Work Lehenga Choli','Festive Edit','Lehenga Cholis','Art Silk','Green, Orange, Pink','XS-S-M-L-XL-2XL-3XL',189.00,'Traditional mirror embroidery, crop blouse, flowy skirt',images.festive),collections:['Women','Festive Edit']},
    {...product('fm-wl-03','Sequin Party Lehenga','Festive Edit','Lehenga Cholis','Net Fabric','Silver, Gold, Black','XS-S-M-L-XL-2XL',229.50,'All-over sequin shimmer, detachable sleeves, tulle lining','/social/flairmantra-grey-navratri.jpeg'),collections:['Women','Festive Edit']},
    {...product('fm-wl-04','Indo-Western Lehenga Set','Festive Edit','Lehenga Cholis','Raw Silk','Ivory, Blush, Sage','XS-S-M-L-XL-2XL',199.00,'Modern crop top with lehenga skirt, minimalist embroidery','/images/catalog/ivory-sage-lehenga.png'),collections:['Women','Festive Edit']},
    product('fm-mk-01','Classic Cotton Kurta','Men','Kurtas & Sherwanis','Pure Cotton','White, Off-White, Sky Blue','S-M-L-XL-2XL-3XL-4XL',34.99,'Straight fit, mandarin collar, full sleeves','/images/men-ivory-kurta.png','New'),
    product('fm-mk-02','Pathani Kurta Set','Men','Kurtas & Sherwanis','Cotton Silk','Black, Beige, Maroon','S-M-L-XL-2XL-3XL',58.00,'Paired with tapered trousers, button detail','/images/men-emerald-sherwani.png'),
    product('fm-ms-01','Embroidered Wedding Sherwani','Men','Kurtas & Sherwanis','Brocade Silk','Ivory, Gold, Deep Green','S-M-L-XL-2XL',289.00,'Intricate thread work, mandarin collar, lining included','/images/men-emerald-sherwani.png'),
    product('fm-mj-01','Velvet Nehru Jacket','Men','Kurtas & Sherwanis','Pure Velvet','Burgundy, Midnight Blue, Black','S-M-L-XL-2XL-3XL',76.50,'Peak lapel, embroidered cuffs, festive layering','/images/men-ivory-kurta.png'),
    product('fm-fw-01','Block Print Midi Dress','Fusion Wear','Dresses','Viscose','Indigo, Rust, Forest','XS-S-M-L-XL-2XL',52.00,'Hand block print, softly defined waist, midi length','/images/catalog/indigo-fusion-dress.png','New'),
    product('fm-fw-02','Embroidered Wide-Leg Jumpsuit','Fusion Wear','Jumpsuits','Crepe','Black, Navy, Olive','XS-S-M-L-XL-2XL-3XL',84.99,'Crew neck, side pockets, thread embroidery on bodice','/social/flairmantra-white-navratri.jpeg'),
    product('fm-fw-03','Printed Cape & Top Set','Fusion Wear','Capes & Jackets','Georgette','Multi, Teal, Purple','XS-S-M-L-XL-2XL',68.00,'Flowing cape with matching sleeveless top','/social/flairmantra-orange-full.jpeg'),
    product('fm-fw-04','Crop Top & Skirt Co-ord','Fusion Wear','Co-ord Sets','Rayon','Coral, Lemon, Turquoise','XS-S-M-L-XL-2XL',48.50,'Ruffle hem skirt, tie-up crop top, festive print','/social/flairmantra-tradition-orange.jpeg'),
    product('fm-aj-01','Emerald Kundan Statement Necklace','Accessories','Jewelry','Kundan, Gold-plated Alloy','Antique Gold, Emerald','One Size',89.00,'Regal kundan necklace with emerald-tone drops and an adjustable tie closure.','/images/accessories/kundan-necklace.jpg','New'),
    product('fm-aj-02','Pearl Drop Jhumka Earrings','Accessories','Jewelry','Kundan, Faux Pearl','Gold, Emerald','One Size',42.00,'Statement jhumkas finished with pearl drops and secure push-back closures.','/images/accessories/pearl-jhumkas.jpg','New'),
    product('fm-af-01','Burgundy Zardozi Punjabi Juttis','Accessories','Footwear','Velvet, Leatherette','Burgundy, Antique Gold','5-6-7-8-9-10-11',54.00,'Hand-finished velvet juttis with floral zardozi embroidery and cushioned lining.','/images/accessories/burgundy-juttis.jpg'),
    product('fm-af-02','Gold Embellished Festive Sandals','Accessories','Footwear','Metallic Leatherette','Gold','5-6-7-8-9-10-11',49.00,'Comfortable slip-on festive sandals with stone and metallic embroidery.','/images/accessories/gold-sandals.jpg'),
    product('fm-ab-01','Maroon Embroidered Potli Bag','Accessories','Bags & Clutches','Velvet, Zari','Maroon, Gold','One Size',46.00,'Round velvet potli with zari florals, pearl trim and handcrafted tassels.','/images/accessories/embroidered-potli.jpg','New'),
    product('fm-ab-02','Black & Gold Bridal Clutch','Accessories','Bags & Clutches','Velvet, Metal Frame','Black, Gold','One Size',64.00,'Structured occasion clutch with dimensional floral embroidery and chain strap.','/images/accessories/bridal-clutch.jpg'),
    product('fm-as-01','Jewel Paisley Silk Scarf','Accessories','Scarves & Masks','Silk Blend','Emerald, Magenta, Teal','One Size',38.00,'Soft jewel-tone paisley scarf with a refined satin finish and hand-rolled edges.','/images/accessories/silk-scarf.jpg'),
    product('fm-as-02','Festive Mask & Scarf Set','Accessories','Scarves & Masks','Cotton Silk','Burgundy, Gold','One Size',44.00,'Coordinated festive scarf and reusable fabric mask with delicate gold motifs.','/images/accessories/mask-scarf-set.jpg')
  ]
};
