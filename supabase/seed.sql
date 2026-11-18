-- =====================================================================
-- Agent Locally · Datos de demo (Fase 1)
-- Restaurantes FICTICIOS en Madrid. Ejecutar DESPUÉS de la migración
-- 0001_esquema_inicial.sql. Es re-ejecutable: borra y recrea la demo.
--
-- Casos de prueba incluidos a propósito:
--  · Embarazo: tiramisú, carbonara, steak tartar, quesos sin pasteurizar,
--    paté, sushi/ceviche/boquerones, tortilla poco cuajada, alcohol en salsas.
--  · Smart Removal: huevos rotos con chorizo (adaptable) vs lasaña boloñesa
--    (carne integrada, no adaptable).
--  · Ingredientes vacíos: el agente debe inferirlos (cocido, croquetas,
--    plato del día).
--  · Alérgenos ocultos: César (anchoas, huevo crudo), pesto (frutos secos).
-- =====================================================================

delete from public.restaurantes where id::text like '00000000-0000-4000-a000-%';

insert into public.restaurantes (id, nombre, tipo_cocina, rango_precio, direccion, latitud, longitud, descripcion, patrocinado) values
('00000000-0000-4000-a000-000000000001','Trattoria Nonna Lucia','italiana',2,'Calle de Santa Isabel 12, Madrid',40.4108,-3.6985,'Pasta fresca casera, pizzas al horno de leña y postres clásicos italianos.',false),
('00000000-0000-4000-a000-000000000002','La Tasca de Embajadores','tapas',1,'Calle de Embajadores 41, Madrid',40.4072,-3.7025,'Tapas tradicionales madrileñas, raciones para compartir y ambiente de barrio.',false),
('00000000-0000-4000-a000-000000000003','Verde Raíz','vegana',2,'Calle de la Palma 20, Madrid',40.4262,-3.7058,'Cocina 100% vegetal de temporada, bowls y hamburguesas plant-based.',false),
('00000000-0000-4000-a000-000000000004','Sushi Kaze','japonesa',3,'Calle de Ponzano 33, Madrid',40.4415,-3.7035,'Barra de sushi, ramen y platos calientes japoneses.',false),
('00000000-0000-4000-a000-000000000005','Asador El Roble','asador',3,'Calle de Velázquez 62, Madrid',40.4280,-3.6835,'Carnes a la brasa de encina, chuletón madurado y verduras asadas.',false),
('00000000-0000-4000-a000-000000000006','Sin Trigo Bistró','sin gluten',2,'Calle Madrid 45, Getafe',40.3168,-3.7262,'Bistró con cocina 100% libre de gluten certificada, cerca del campus de Getafe.',false),
('00000000-0000-4000-a000-000000000007','Taquería La Lupita','mexicana',1,'Calle de Fuencarral 98, Madrid',40.4258,-3.7012,'Tacos, quesadillas y antojitos mexicanos con salsas picantes caseras.',false),
('00000000-0000-4000-a000-000000000008','Mercado Mediterráneo','mediterránea',2,'Calle de Atocha 70, Madrid',40.4118,-3.6985,'Cocina griega, libanesa y española con mucho producto vegetal.',true),
('00000000-0000-4000-a000-000000000009','Casa Pepa','casera',1,'Avenida de la Universidad 18, Leganés',40.3328,-3.7655,'Menú del día casero y guisos tradicionales, junto al campus de Leganés.',false),
('00000000-0000-4000-a000-000000000010','Curry Garden','india',2,'Calle del Ave María 25, Madrid',40.4110,-3.7010,'Currys del norte de la India, tandoor y opciones vegetarianas.',false),
('00000000-0000-4000-a000-000000000011','Le Petit Fromage','francesa',3,'Calle de Serrano 88, Madrid',40.4335,-3.6870,'Bistró francés con tabla de quesos artesanos, patés y cocina clásica.',false),
('00000000-0000-4000-a000-000000000012','Poke Bahía','poke',2,'Calle de Toledo 110, Madrid',40.4060,-3.7110,'Pokes personalizables de pescado, tofu y pollo.',false);

insert into public.platos (restaurante_id, nombre, categoria, descripcion, precio, ingredientes, alergenos_declarados, permite_modificacion, nota_cocina) values
-- 01 · Trattoria Nonna Lucia
('00000000-0000-4000-a000-000000000001','Tiramisú de la casa','Postre','Bizcocho empapado en café con crema de mascarpone.',6.5, ARRAY['bizcochos de soletilla','mascarpone','huevo crudo','azúcar','café','licor amaretto','cacao'], ARRAY['gluten','huevo','lacteos'], false,'La crema se monta con yema y clara crudas.'),
('00000000-0000-4000-a000-000000000001','Lasaña boloñesa','Principal','Capas de pasta, ragú de ternera y bechamel gratinada.',14, ARRAY['pasta de huevo','carne picada de ternera','tomate','cebolla','zanahoria','vino tinto','bechamel','parmesano'], ARRAY['gluten','huevo','lacteos','apio','sulfitos'], false,'La carne va integrada en el ragú; no se puede retirar.'),
('00000000-0000-4000-a000-000000000001','Ensalada César','Entrante','Lechuga romana, pollo, picatostes y salsa César.',11, ARRAY['lechuga romana','pechuga de pollo','picatostes','parmesano','salsa césar (anchoas, yema cruda, aceite, ajo, mostaza)'], ARRAY['gluten','huevo','lacteos','pescado','mostaza'], true,'El pollo y los picatostes se pueden quitar; la salsa se prepara aparte y puede servirse sin ella.'),
('00000000-0000-4000-a000-000000000001','Pizza margarita','Principal','Tomate, mozzarella fior di latte y albahaca.',11, ARRAY['masa de trigo','tomate','mozzarella pasteurizada','albahaca','aceite de oliva'], ARRAY['gluten','lacteos'], true,'Se puede pedir sin queso.'),
('00000000-0000-4000-a000-000000000001','Spaghetti carbonara','Principal','Receta romana con guanciale, yema y pecorino.',13, ARRAY['spaghetti','guanciale','yema de huevo poco cocinada','pecorino romano','pimienta negra'], ARRAY['gluten','huevo','lacteos'], false,'La yema se liga fuera del fuego (queda poco cocinada). El guanciale va integrado.'),
('00000000-0000-4000-a000-000000000001','Risotto de setas','Principal','Arroz carnaroli con boletus y parmesano.',14.5, ARRAY['arroz carnaroli','boletus','champiñones','caldo de verduras','vino blanco','mantequilla','parmesano'], ARRAY['lacteos','sulfitos','apio'], false,'Se cocina con vino blanco que se evapora parcialmente.'),
('00000000-0000-4000-a000-000000000001','Trofie al pesto','Principal','Pasta corta con pesto genovés casero.',12.5, ARRAY['trofie','albahaca','piñones','anacardos','parmesano','ajo','aceite de oliva'], ARRAY['gluten','frutos_secos','lacteos'], false,'El pesto lleva piñones y anacardos; no hay versión sin frutos secos.'),
-- 02 · La Tasca de Embajadores
('00000000-0000-4000-a000-000000000002','Huevos rotos con chorizo','Principal','Patatas fritas, huevos fritos y chorizo a la plancha.',10, ARRAY['patatas','huevo','chorizo','aceite de oliva','sal'], ARRAY['huevo'], true,'El chorizo se añade al final, se puede omitir. Huevo frito con yema líquida salvo que se pida bien hecho.'),
('00000000-0000-4000-a000-000000000002','Patatas bravas','Entrante','Patatas fritas con salsa brava picante y alioli.',6, ARRAY['patatas','salsa brava (pimentón picante, harina, caldo)','alioli (huevo, ajo, aceite)'], ARRAY['gluten','huevo'], true,'Se pueden servir sin alioli. La salsa brava lleva harina.'),
('00000000-0000-4000-a000-000000000002','Croquetas de la abuela','Entrante','Croquetas caseras cremosas (6 uds).',8, ARRAY[]::text[], ARRAY[]::text[], false, null),
('00000000-0000-4000-a000-000000000002','Tortilla de patatas jugosa','Principal','Tortilla poco cuajada, al estilo de la casa.',9, ARRAY['huevo','patata','cebolla','aceite de oliva'], ARRAY['huevo'], true,'Se sirve poco cuajada; se puede pedir bien hecha.'),
('00000000-0000-4000-a000-000000000002','Pimientos de Padrón','Entrante','Fritos con sal gorda.',6, ARRAY['pimientos de padrón','aceite de oliva','sal gorda'], ARRAY[]::text[], false, null),
('00000000-0000-4000-a000-000000000002','Boquerones en vinagre','Entrante','Boquerones marinados en vinagre, ajo y perejil.',7.5, ARRAY['boquerones crudos marinados','vinagre','ajo','perejil','aceite de oliva'], ARRAY['pescado','sulfitos'], false,'Pescado crudo marinado (congelado previamente).'),
('00000000-0000-4000-a000-000000000002','Gambas al ajillo','Entrante','En cazuela de barro con guindilla.',12, ARRAY['gambas','ajo','guindilla','aceite de oliva','perejil'], ARRAY['crustaceos'], true,'Se puede pedir sin guindilla.'),
-- 03 · Verde Raíz
('00000000-0000-4000-a000-000000000003','Buddha bowl de temporada','Principal','Quinoa, boniato asado, garbanzos, kale y salsa de tahini.',12.5, ARRAY['quinoa','boniato','garbanzos','kale','aguacate','salsa de tahini','semillas de sésamo'], ARRAY['sesamo'], true,'La salsa de tahini va aparte y se puede cambiar por limón y aceite.'),
('00000000-0000-4000-a000-000000000003','Burger de lentejas','Principal','Hamburguesa de lentejas y remolacha con pan brioche vegano.',13, ARRAY['lentejas','remolacha','avena','pan de trigo','mayonesa vegana de soja','lechuga','tomate'], ARRAY['gluten','soja'], true,'Disponible con pan sin gluten (la avena no es certificada sin gluten).'),
('00000000-0000-4000-a000-000000000003','Curry de garbanzos y coco','Principal','Curry suave con leche de coco y arroz basmati.',12, ARRAY['garbanzos','leche de coco','tomate','espinacas','curry','arroz basmati'], ARRAY[]::text[], false, null),
('00000000-0000-4000-a000-000000000003','Gazpacho andaluz','Entrante','Frío, con picatostes aparte.',6, ARRAY['tomate','pepino','pimiento','ajo','aceite de oliva','vinagre de jerez','picatostes'], ARRAY['gluten','sulfitos'], true,'Los picatostes se sirven aparte.'),
('00000000-0000-4000-a000-000000000003','Tarta de chocolate y aguacate','Postre','Tarta cruda de cacao sobre base de nueces y dátiles.',6.5, ARRAY['aguacate','cacao','dátiles','nueces','sirope de agave'], ARRAY['frutos_secos'], false,'La base es de nueces.'),
('00000000-0000-4000-a000-000000000003','Tacos de jackfruit BBQ','Principal','Tortillas de maíz con jackfruit en salsa barbacoa y col morada.',11, ARRAY['tortilla de maíz','jackfruit','salsa barbacoa','col morada','cilantro','lima'], ARRAY[]::text[], false, null),
-- 04 · Sushi Kaze
('00000000-0000-4000-a000-000000000004','Nigiri de salmón (4 uds)','Principal','Salmón noruego sobre arroz de sushi.',9, ARRAY['salmón crudo','arroz','vinagre de arroz','wasabi'], ARRAY['pescado'], false,'Pescado crudo (congelado previamente).'),
('00000000-0000-4000-a000-000000000004','Maki de aguacate y pepino','Principal','8 piezas vegetales.',7, ARRAY['arroz','alga nori','aguacate','pepino','sésamo'], ARRAY['sesamo'], true,'Se puede pedir sin sésamo. Servir con salsa de soja aparte (contiene gluten).'),
('00000000-0000-4000-a000-000000000004','Gyozas de cerdo','Entrante','Empanadillas a la plancha con salsa ponzu.',8.5, ARRAY['harina de trigo','carne de cerdo','col','cebollino','jengibre','salsa de soja'], ARRAY['gluten','soja'], false, null),
('00000000-0000-4000-a000-000000000004','Edamame','Entrante','Vainas de soja con sal en escamas.',5, ARRAY['edamame','sal'], ARRAY['soja'], false, null),
('00000000-0000-4000-a000-000000000004','Ramen tonkotsu','Principal','Caldo de hueso de cerdo, chashu, huevo marinado y fideos.',15, ARRAY['caldo de cerdo','fideos de trigo','panceta chashu','huevo marinado (yema líquida)','cebolleta','alga nori','salsa de soja'], ARRAY['gluten','huevo','soja','sesamo'], true,'El huevo se puede retirar. El caldo es de cerdo (no apto vegetarianos).'),
('00000000-0000-4000-a000-000000000004','Tempura de verduras','Entrante','Verduras de temporada en tempura ligera.',9, ARRAY['harina de trigo','huevo','calabacín','berenjena','boniato','espárrago'], ARRAY['gluten','huevo'], false,'Rebozado estructural con harina de trigo.'),
('00000000-0000-4000-a000-000000000004','Mochi de té matcha','Postre','2 unidades de mochi relleno de helado.',6, ARRAY['harina de arroz glutinoso','azúcar','helado de matcha (leche, nata)'], ARRAY['lacteos'], false, null),
-- 05 · Asador El Roble
('00000000-0000-4000-a000-000000000005','Chuletón madurado (1 kg)','Principal','Vaca rubia gallega a la brasa, con patatas.',58, ARRAY['chuletón de vaca','sal gorda','patatas'], ARRAY[]::text[], false,'Se sirve poco hecho salvo que se pida en su punto o muy hecho.'),
('00000000-0000-4000-a000-000000000005','Steak tartar','Entrante','Solomillo picado a cuchillo con yema y alcaparras.',19, ARRAY['solomillo crudo','yema de huevo cruda','alcaparras','pepinillo','mostaza dijon','salsa worcestershire','tabasco'], ARRAY['huevo','mostaza','pescado'], false,'Carne y yema crudas. La salsa worcestershire contiene anchoas.'),
('00000000-0000-4000-a000-000000000005','Ensalada de la casa','Entrante','Lechugas, tomate, cebolla, huevo cocido, atún y aceitunas.',9, ARRAY['lechuga','tomate','cebolla','huevo cocido','atún en conserva','aceitunas'], ARRAY['huevo','pescado'], true,'Se monta al momento: se puede pedir sin atún y/o sin huevo.'),
('00000000-0000-4000-a000-000000000005','Pimientos rojos asados','Entrante','Asados en la brasa con aceite y ajo.',8, ARRAY['pimiento rojo','aceite de oliva','ajo','sal'], ARRAY[]::text[], false, null),
('00000000-0000-4000-a000-000000000005','Provolone a la brasa','Entrante','Queso provolone fundido con orégano.',10, ARRAY['queso provolone','orégano','aceite de oliva'], ARRAY['lacteos'], false,'Provolone de leche pasteurizada.'),
('00000000-0000-4000-a000-000000000005','Tarta de queso cremosa','Postre','Al horno, con el centro cremoso.',7, ARRAY['queso crema pasteurizado','huevo','nata','azúcar','galleta'], ARRAY['huevo','lacteos','gluten'], false,'El centro queda poco cuajado (huevo poco cocinado).'),
-- 06 · Sin Trigo Bistró (100% sin gluten)
('00000000-0000-4000-a000-000000000006','Pizza sin gluten de verduras','Principal','Masa sin gluten certificada, verduras asadas y mozzarella.',13, ARRAY['masa sin gluten (harina de arroz, maíz)','tomate','calabacín','pimiento','champiñón','mozzarella pasteurizada'], ARRAY['lacteos'], true,'Se puede pedir sin queso o con queso vegano.'),
('00000000-0000-4000-a000-000000000006','Hamburguesa de ternera con pan sin gluten','Principal','Ternera, cheddar, bacon y pan sin gluten.',14, ARRAY['ternera','pan sin gluten','queso cheddar','bacon','lechuga','tomate','salsa de la casa (huevo)'], ARRAY['lacteos','huevo','mostaza'], true,'Bacon y cheddar se añaden al montar; se pueden retirar.'),
('00000000-0000-4000-a000-000000000006','Ensalada de quinoa y feta','Entrante','Quinoa, pepino, tomate cherry, feta y menta.',10, ARRAY['quinoa','pepino','tomate cherry','queso feta','menta','limón'], ARRAY['lacteos'], true,'El feta se puede retirar. Consultar si el feta es pasteurizado.'),
('00000000-0000-4000-a000-000000000006','Crema de calabaza','Entrante','Con jengibre y semillas de calabaza.',7, ARRAY['calabaza','cebolla','jengibre','caldo de verduras','semillas de calabaza'], ARRAY['apio'], false, null),
('00000000-0000-4000-a000-000000000006','Brownie sin gluten','Postre','Con nueces y helado de vainilla.',6.5, ARRAY['chocolate','mantequilla','huevo','harina de almendra','nueces','helado de vainilla'], ARRAY['huevo','lacteos','frutos_secos'], false,'La harina es de almendra.'),
-- 07 · Taquería La Lupita
('00000000-0000-4000-a000-000000000007','Tacos al pastor (3 uds)','Principal','Cerdo adobado con piña, cebolla y cilantro.',9, ARRAY['tortilla de maíz','cerdo adobado','piña','cebolla','cilantro','salsa picante'], ARRAY[]::text[], false, null),
('00000000-0000-4000-a000-000000000007','Quesadilla de queso Oaxaca','Principal','Tortilla de trigo con queso fundido.',8, ARRAY['tortilla de trigo','queso oaxaca'], ARRAY['gluten','lacteos'], false,'Queso Oaxaca de importación, sin confirmar pasteurización.'),
('00000000-0000-4000-a000-000000000007','Guacamole con totopos','Entrante','Preparado al momento.',8.5, ARRAY['aguacate','tomate','cebolla','cilantro','lima','jalapeño','totopos de maíz'], ARRAY[]::text[], true,'Se puede pedir sin jalapeño.'),
('00000000-0000-4000-a000-000000000007','Burrito vegetal','Principal','Frijoles, arroz, pico de gallo, crema agria y queso.',10, ARRAY['tortilla de trigo','frijoles','arroz','pico de gallo','crema agria','queso cheddar'], ARRAY['gluten','lacteos'], true,'Crema agria y queso se añaden al final; se pueden omitir (queda vegano).'),
('00000000-0000-4000-a000-000000000007','Ceviche de corvina','Entrante','Corvina marinada en lima con cebolla morada y ají.',12, ARRAY['corvina cruda','lima','cebolla morada','ají','cilantro','maíz'], ARRAY['pescado'], false,'Pescado crudo marinado en cítrico.'),
-- 08 · Mercado Mediterráneo (patrocinado)
('00000000-0000-4000-a000-000000000008','Hummus con pan de pita','Entrante','Hummus casero con pimentón y pan de pita.',7, ARRAY['garbanzos','tahini','limón','ajo','aceite de oliva','pan de pita'], ARRAY['sesamo','gluten'], true,'Se puede servir con crudités en lugar de pita.'),
('00000000-0000-4000-a000-000000000008','Falafel con salsa de yogur','Principal','6 falafel caseros con ensalada y salsa de yogur.',11, ARRAY['garbanzos','perejil','cilantro','comino','sésamo','salsa de yogur'], ARRAY['sesamo','lacteos'], true,'La salsa de yogur va aparte (sin ella es vegano). Se fríe en freidora compartida con rebozados de trigo.'),
('00000000-0000-4000-a000-000000000008','Moussaka','Principal','Berenjena, carne de cordero y bechamel gratinada.',14, ARRAY['berenjena','carne picada de cordero','tomate','vino tinto','bechamel','queso'], ARRAY['gluten','lacteos','sulfitos'], false,'La carne va integrada entre capas.'),
('00000000-0000-4000-a000-000000000008','Ensalada griega','Entrante','Tomate, pepino, cebolla, aceitunas kalamata y feta.',9.5, ARRAY['tomate','pepino','cebolla roja','aceitunas kalamata','queso feta','orégano'], ARRAY['lacteos'], true,'El feta se puede retirar. Feta de leche de oveja pasteurizada.'),
('00000000-0000-4000-a000-000000000008','Pulpo a la gallega','Principal','Con patata cachelo y pimentón.',18, ARRAY['pulpo','patata','pimentón','sal gorda','aceite de oliva'], ARRAY['moluscos'], false, null),
('00000000-0000-4000-a000-000000000008','Baklava','Postre','Hojaldre con pistachos, nueces y miel.',5.5, ARRAY['masa filo','pistachos','nueces','miel','mantequilla'], ARRAY['gluten','frutos_secos','lacteos'], false, null),
-- 09 · Casa Pepa
('00000000-0000-4000-a000-000000000009','Cocido madrileño','Principal','El de toda la vida, en dos vuelcos.',13, ARRAY[]::text[], ARRAY[]::text[], false, null),
('00000000-0000-4000-a000-000000000009','Lentejas estofadas','Principal','Con chorizo, verduras y pimentón.',9, ARRAY['lentejas','chorizo','zanahoria','cebolla','pimiento','pimentón','harina'], ARRAY['gluten'], false,'El chorizo se cuece con las lentejas (el caldo lo contiene).'),
('00000000-0000-4000-a000-000000000009','Merluza a la romana','Principal','Rebozada, con patatas fritas.',12, ARRAY['merluza','harina de trigo','huevo','patatas'], ARRAY['pescado','gluten','huevo'], false,'Rebozado estructural; se puede pedir a la plancha.'),
('00000000-0000-4000-a000-000000000009','Pollo asado con patatas','Principal','Medio pollo al horno con ajo y tomillo.',10, ARRAY['pollo','patatas','ajo','tomillo','vino blanco','aceite de oliva'], ARRAY['sulfitos'], false,'Se riega con vino blanco al hornear.'),
('00000000-0000-4000-a000-000000000009','Ensaladilla rusa','Entrante','Con mayonesa casera y ventresca.',7, ARRAY['patata','zanahoria','guisantes','atún','mayonesa casera (huevo crudo)','aceitunas'], ARRAY['huevo','pescado'], false,'Mayonesa casera con huevo crudo.'),
('00000000-0000-4000-a000-000000000009','Flan de huevo casero','Postre','Con caramelo y nata montada.',4.5, ARRAY['huevo','leche','azúcar','caramelo','nata'], ARRAY['huevo','lacteos'], true,'Huevo cocido al baño maría (cuajado). Se puede servir sin nata.'),
-- 10 · Curry Garden
('00000000-0000-4000-a000-000000000010','Pollo tikka masala','Principal','Pollo tandoori en salsa de tomate, nata y anacardos.',14, ARRAY['pollo','yogur','tomate','nata','anacardos','garam masala','mantequilla'], ARRAY['lacteos','frutos_secos'], false,'La salsa lleva anacardos molidos.'),
('00000000-0000-4000-a000-000000000010','Dal tadka','Principal','Lentejas amarillas con comino, ajo y cúrcuma.',10, ARRAY['lentejas amarillas','cebolla','tomate','ajo','comino','cúrcuma','ghee'], ARRAY['lacteos'], true,'Se puede pedir con aceite vegetal en lugar de ghee (queda vegano).'),
('00000000-0000-4000-a000-000000000010','Samosas vegetales','Entrante','2 unidades de patata y guisantes.',6, ARRAY['harina de trigo','patata','guisantes','especias'], ARRAY['gluten'], false, null),
('00000000-0000-4000-a000-000000000010','Palak paneer','Principal','Espinacas cremosas con queso paneer casero.',12, ARRAY['espinacas','paneer casero','nata','cebolla','especias'], ARRAY['lacteos'], false,'El paneer se elabora en casa con leche pasteurizada.'),
('00000000-0000-4000-a000-000000000010','Naan de ajo','Entrante','Pan al tandoor con mantequilla de ajo.',3.5, ARRAY['harina de trigo','yogur','mantequilla','ajo'], ARRAY['gluten','lacteos'], false, null),
('00000000-0000-4000-a000-000000000010','Lassi de mango','Bebida','Batido de yogur y mango.',4, ARRAY['yogur','mango','azúcar','cardamomo'], ARRAY['lacteos'], false, null),
-- 11 · Le Petit Fromage
('00000000-0000-4000-a000-000000000011','Tabla de quesos artesanos','Entrante','Camembert de lait cru, Roquefort y Comté.',18, ARRAY['camembert de leche cruda','roquefort','comté','nueces','uvas','pan'], ARRAY['lacteos','frutos_secos','gluten'], true,'Quesos de leche cruda (sin pasteurizar). Se puede pedir solo Comté.'),
('00000000-0000-4000-a000-000000000011','Paté de campaña','Entrante','Paté de cerdo e hígado con pepinillos y pan tostado.',12, ARRAY['hígado de cerdo','carne de cerdo','coñac','pepinillos','pan'], ARRAY['gluten','sulfitos'], false, null),
('00000000-0000-4000-a000-000000000011','Quiche lorraine','Principal','Masa quebrada, bacon, huevo y nata.',13, ARRAY['masa quebrada','bacon','huevo','nata','queso gruyère'], ARRAY['gluten','huevo','lacteos'], false,'El bacon se hornea dentro del relleno.'),
('00000000-0000-4000-a000-000000000011','Sopa de cebolla gratinada','Entrante','Con pan y queso gratinado.',10, ARRAY['cebolla','caldo de ternera','vino blanco','pan','queso gruyère','mantequilla'], ARRAY['gluten','lacteos','sulfitos'], false, null),
('00000000-0000-4000-a000-000000000011','Coq au vin','Principal','Pollo guisado en vino tinto con champiñones.',22, ARRAY['pollo','vino tinto','bacon','champiñones','cebollitas','harina'], ARRAY['gluten','sulfitos'], false,'Salsa a base de vino tinto (reducción corta).'),
('00000000-0000-4000-a000-000000000011','Crème brûlée','Postre','Crema de vainilla con azúcar caramelizado.',8, ARRAY['nata','yemas de huevo','azúcar','vainilla'], ARRAY['huevo','lacteos'], false, null),
('00000000-0000-4000-a000-000000000011','Plat du jour','Principal','Pregunte al personal por el plato del día.',19, ARRAY[]::text[], ARRAY[]::text[], false, null),
-- 12 · Poke Bahía
('00000000-0000-4000-a000-000000000012','Poke de salmón','Principal','Salmón crudo, arroz, aguacate, edamame y salsa ponzu.',13.5, ARRAY['salmón crudo','arroz de sushi','aguacate','edamame','pepino','salsa ponzu (soja)','sésamo'], ARRAY['pescado','soja','sesamo','gluten'], true,'Se puede cambiar la proteína por tofu o pollo.'),
('00000000-0000-4000-a000-000000000012','Poke de tofu','Principal','Tofu marinado, arroz integral, mango y col morada.',12, ARRAY['tofu','arroz integral','mango','col morada','zanahoria','salsa de sésamo'], ARRAY['soja','sesamo'], false, null),
('00000000-0000-4000-a000-000000000012','Poke de pollo teriyaki','Principal','Pollo a la plancha con salsa teriyaki.',12.5, ARRAY['pollo','salsa teriyaki (soja, azúcar, mirin)','arroz','maíz','edamame','cebolla crujiente'], ARRAY['soja','gluten'], true,'La cebolla crujiente lleva harina; se puede retirar.'),
('00000000-0000-4000-a000-000000000012','Açaí bowl','Postre','Açaí, plátano, granola y mantequilla de cacahuete.',8, ARRAY['açaí','plátano','granola (avena, miel)','mantequilla de cacahuete','fresas'], ARRAY['gluten','cacahuete'], true,'Se puede pedir sin mantequilla de cacahuete y sin granola.');

-- Memoria colectiva de ejemplo (para que la demo muestre la insignia social)
insert into public.historial_elecciones (firma_perfil, restaurante_id, contador_selecciones) values
('embarazo+sin_gluten', '00000000-0000-4000-a000-000000000006', 9),
('vegano',              '00000000-0000-4000-a000-000000000003', 14),
('vegetariano',         '00000000-0000-4000-a000-000000000008', 6),
('embarazo+vegetariano','00000000-0000-4000-a000-000000000010', 4),
('sin_lactosa',         '00000000-0000-4000-a000-000000000007', 3);
