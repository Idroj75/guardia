(() => {
  'use strict';
  const chapters = [
    {title:'Calendari',items:[
      'Tria un torn, un permís o un concepte d’hores al selector i toca els dies per pintar-los. El color de cada torn es canvia a «Torn» i es mostra al calendari. Els permisos també tenen el seu color configurat a «Torn».',
      'Un mateix dia pot tenir torn, hores de BL, perllongament i ticket. Escriu les hores variables en format hores:minuts, per exemple 2:30. La BC es gestiona a «Torn» → «BC · Coeficients».',
      'Fes lliscar el mes cap als costats per avançar o retrocedir. «Desfer» recupera els darrers tocs. Amb «Consultar» veus els detalls; amb «Editar» gestiones els intervals, i amb «Esborrar dia» tries què vols treure.',
      'El dia d’avui té un marc vermell. Els judicis i els dies especials apareixen al calendari, però les seves fitxes es gestionen a les pestanyes pròpies.'
    ]},
    {title:'Tickets',items:[
      'Els tickets són els comentaris que apuntes en un dia del calendari. Pots marcar-los amb una, dues o tres estrelles segons la importància.',
      'Aquí veus els tickets d’avui i futurs. Els passats continuen en gris durant set dies i després s’eliminen automàticament.',
      'Per editar un ticket vigent, obre el seu dia al calendari. Si ja ha passat, encara el pots consultar i eliminar mentre sigui visible.'
    ]},
    {title:'Totals',items:[
      'L’any policial va de l’1 de febrer al 31 de gener. Canvia d’any amb les fletxes. Al capdamunt tens el regal per consultar la trajectòria al cos. Després veus les hores anuals, les planificades al quadrant i el romanent. Introdueix les hores anuals a la seva targeta i prem «Desar». Amb «Editar» pots modificar-les per a l’any policial seleccionat.',
      'El romanent és la diferència entre les hores anuals i les planificades; les bosses i els permisos tenen el seu propi saldo i no alteren aquest còmput.',
      'A sota, passa les targetes de saldos amb el dit. Cada una mostra el saldo inicial, les hores afegides, les descomptades i les restants. Hi apareixen VAC, PAP, BL, BC, DB i els saldos personals actius. El regal de dalt mostra la trajectòria calculada a partir del Perfil.',
      'També hi ha totals de judicis, hores extres i detinguts. Obre «Instruccions · Com llegir els totals» dins la pantalla per veure els càlculs amb més detall.'
    ]},
    {title:'Torn',items:[
      'A «Torns», una instal·lació nova porta exemples editables de matins, tardes, nits i Festa, sense cap dia assignat. Crea horaris amb abreviatura, nom, inici, final i color. El color de cada torn es mostra al seu dia del calendari; si hi ha dos torns, el segon també conserva el seu color. Els dies amb permís mostren el color del permís. «Festa» sempre val 0 hores i es pot editar o retirar; els dies de festa existents es conserven. Si elimines un altre torn de servei, també s’eliminen les seves assignacions al calendari.',
      'Les hores anuals es gestionen a «Totals → Hores anuals i quadrant». A «Saldos», pots editar els saldos inicials de VAC, PAP, BL, DB i els que creïs. El saldo inicial de BC és a «BC · Coeficients», dins de «Torn».',
      'A «Hores positives» i «Hores negatives», crea un concepte i indica quin saldo augmenta o disminueix. Per exemple, un perllongament de BL es pot introduir al calendari amb les hores de cada dia. Els moviments de BC es fan a «BC · Coeficients», dins de «Torn».',
      'Els saldos i conceptes es poden editar, retirar i restaurar des d’aquesta pestanya. En retirar-los, deixen de servir per a entrades noves, però els moviments ja apuntats es conserven.',
      'Obre «BC · Coeficients» dins de «Torn» per posar el saldo inicial i el color. Els factors estan separats en dos quadres: «Acumular» a l’esquerra i «Gastar» a la dreta. Cada quadre té diürn, nocturn i cap de setmana o festiu. Les entrades antigues de BC també es poden editar o eliminar allí.',
      'Per a un moviment nou de BC, indica la data i l’horari, revisa el càlcul i desa. Quan deses correctament, tornaràs a la secció de Torn on eres. Amb «Tornar a Torn» pots sortir sense desar. El color de BC pinta el seu marcador al calendari i, si el dia no té torn ni permís, també la casella. La BC apareix a «Totals», però només es modifica aquí.'
    ]},
    {title:'Quadrants',items:[
      'Indica «Des del dia» i «Fins al dia» per generar el quadrant dins d’aquest interval. Pots posar de l’1 de febrer al 31 de gener per crear un any complet, o un interval més curt per canviar de torn o escamot.',
      'Tria el quadrant i l’escamot: Q5 té escamots 1 a 5 i Q3 té A, B i C. Prem «Generar» i confirma el canvi.',
      'El nou torn apareix al Calendari amb els colors configurats a «Torn», sense crear duplicats si el torn ja existeix. Els permisos i els dies passats amb dades apuntades es conserven; altres anotacions com judicis i tickets també es mantenen. A «Totals» veuràs les hores planificades i el romanent actualitzats.',
      'El Q3 repeteix tres setmanes: tardes de dilluns a divendres i cap de setmana lliure; matins de dilluns a divendres i cap de setmana de 12 hores; festa completa. Les hores dels matins i les tardes són les del torn configurat a «Torn». Referència de la rotació: dilluns 3 de febrer de 2025, A tardes, B matins i C festa. La rotació continua entre anys. El Q5 manté el patró facilitat; contrasta el calendari amb el quadrant oficial.',
      'Els altres quadrants, inclosos 7×7, Q5 de Trànsit i Oficina, es poden planificar manualment al Calendari perquè depenen del grup, l’ABP, la unitat i els horaris de servei.'
    ]},
    {title:'Llistats',items:[
      'Tria una data inicial, una final i què vols consultar; després prem «Mostrar llistat». Pots veure VAC, PAP, BL, DB, romanent, perllongaments de BL i els conceptes d’hores que hagis creat. La BC es llista a «Torn» → «BC · Coeficients».',
      'Pots triar un torn creat, com «Baixa», per veure els dies en què l’has assignat i les hores d’aquell torn. «Tots els torns» inclou també Festa. Si hi ha diversos torns en un dia, les hores del torn triat es compten per separat.',
      'Per a BL pots separar hores utilitzades, acumulades o tots els moviments. També hi ha llistats de judicis i hores extres. Els serveis es llisten dins de «Servei».',
      'Cada resultat mostra les dates i un total al final. Quan les dates es presenten com a text, es mostren en format dia/mes/any.'
    ]},
    {title:'Detinguts',items:[
      'Prem «Afegir» i anota la data, les diligències, el concepte i el nombre de detinguts. També pots escriure les dades dels detinguts, una nota i fins a vuit TIP d’agents.',
      'Amb les fletxes consultes cada any policial. La pantalla suma persones i registres; el total de persones del mateix any també surt a «Totals».',
      'Obre un registre per editar-lo o eliminar-lo. Aquestes dades formen part de la còpia de seguretat del dispositiu.'
    ]},
    {title:'Judicis i cobraments',items:[
      'Crea la citació amb tribunal, localitat, procediment, atestat, data i hora; completa la secció, sala, adreça i TIP dels agents que calguin. El teu TIP es proposa si el tens al Perfil.',
      'La J marca el judici al calendari. Segons la data, la fitxa apareix entre els judicis pendents o els realitzats. Des de la seva configuració pots consultar-la, editar-la o eliminar-la.',
      'Posa l’import del judici i marca’l com a pagat quan el cobris. La pantalla separa diners pendents i cobrats.',
      'Per rebre un avís amb l’app tancada, tria d’1 a 7 dies d’antelació, obre la configuració del judici i afegeix-ne l’esdeveniment al Calendari del mòbil. Guardar la citació a Guàrdia per si sol no crea l’alarma del telèfon.'
    ]},
    {title:'Dies especials',items:[
      'Amb les fletxes canvies d’any policial. Pots crear tants dies especials com vulguis, editar-los o eliminar-los directament del llistat. També pots deixar l’any sense cap dia especial.',
      'Indica la franja horària i el preu per hora. L’import depèn de les hores treballades dins la franja; si no hi ha feina registrada, no es genera cap import. Si treballes fora del torn, apunta les hores addicionals a la fitxa.',
      'La pantalla separa import futur, pendent de cobrar i cobrat. Marca el dia com a pagat quan rebis els diners.',
      'Els festius oficials es poden mostrar al calendari des del Perfil. Aquesta marca és informativa i no crea automàticament un dia especial remunerat.'
    ]},
    {title:'H. extres',items:[
      'Tria una sola categoria activa i revisa els preus per hora normal i nocturna o festiva. Pots editar les tarifes; els registres ja desats mantenen el preu que tenien en crear-los.',
      'Apunta cada jornada d’hores extres amb la data, les hores i el tipus de tarifa. L’import es calcula amb el preu aplicable i pots marcar el cobrament.',
      'Consulta les hores fetes, les previstes i els diners pendents o cobrats en aquesta pestanya i a «Totals». Els llistats mostren les hores extres per dates; es compten separades del quadrant ordinari.'
    ]},
    {title:'Nòmines',items:[
      'Selecciona l’any i el mes i escriu l’import net cobrat. Pots editar-lo o eliminar l’import d’aquell mes; deixa en blanc els mesos que encara no has cobrat.',
      'La comparació mostra l’any seleccionat i els dos anteriors, de gener a desembre. Com més alt és l’import, més intens és el verd.',
      'Les nòmines són imports introduïts manualment: no es generen a partir de judicis, dies especials ni hores extres.'
    ]},
    {title:'Servei',items:[
      'En una instal·lació nova trobaràs «Porta», «Custòdia» (estàtica) i «300» com a exemples sense cap dia assignat. A «Consultar serveis» pots modificar-los o anul·lar-los. Prem el botó vermell «Crear servei» per afegir-ne un amb número de l’1 al 99, nom i la marca «És una estàtica» si correspon.',
      'Prem «Assignar servei», tria la data i un servei creat. Si és una estàtica, l’app ho sap pel tipus de servei. Els TIP dels companys són opcionals. Si tries una data que ja tenia servei, podràs consultar-ne l’assignació, modificar-la o eliminar-la.',
      'Prem «Llistar serveis» quan vulguis consultar-los. Tria l’any policial, de l’1 de febrer al 31 de gener, i filtra totes les estàtiques o un tipus concret. Veuràs les dates i el total; els TIP dels companys no hi apareixen. Després de desar o eliminar, sentiràs el clic si el tens activat i tornaràs a la vista inicial de Servei.'
    ]},
    {title:'Responsabilitat',items:[
      'Registra el complement per assumir funcions d’una categoria superior. Tria el teu grau, la responsabilitat coberta i un dia o un interval. «Preparar dies» agafa les hores del calendari; revisa-les i ajusta les hores efectivament assumides abans de desar.',
      'Cada dia conserva les hores i la tarifa amb què es va desar. Les tarifes de referència de 2026 són les facilitades: mosso a caporal 2,53 €/h; mosso a sergent 5,04 €/h; caporal a sergent i sergent a sotsinspector 2,53 €/h. Configura les tarifes dels altres anys dins d’aquesta pestanya.',
      'Consulta cada mes les hores, l’import calculat, el pendent i el cobrat. Pots editar o eliminar un dia i marcar-lo com a cobrat indicant el mes de nòmina. «Tornar pendent» desfà aquesta marca. El complement no modifica les hores anuals, les bosses ni els torns.'
    ]},
    {title:'Perfil',items:[
      'El nom i els cognoms són opcionals. Desa la categoria, el número professional, l’escamot, la data d’ingrés, la data de naixement i l’edat de jubilació per a la capçalera i la simulació de trajectòria a «Totals».',
      'Les hores anuals es configuren a «Totals» i els saldos inicials a «Torn → Saldos». La categoria apareix damunt de les estrelles de la capçalera i serveix de valor habitual a «Responsabilitat».',
      'Activa o desactiva el so d’obertura, el so de confirmació i les marques dels festius oficials al calendari. Les marques disponibles corresponen als calendaris incorporats a l’app.',
      'Les dades es desen en el navegador d’aquest dispositiu. Fes servir «Desar còpia de seguretat» i guarda el fitxer en un lloc privat; podràs restaurar-lo si canvies de mòbil o esborres les dades del navegador.'
    ]}
  ];
  const track=document.getElementById('manualTrack'),count=document.getElementById('manualCount'),prev=document.getElementById('manualPrev'),next=document.getElementById('manualNext');
  for(const [index,chapter] of chapters.entries()){
    const article=document.createElement('article');article.className='manual-card';article.setAttribute('aria-label',chapter.title);
    const eyebrow=document.createElement('small');eyebrow.textContent='SECCIÓ '+(index+1);
    const title=document.createElement('h3');title.textContent=chapter.title;
    const list=document.createElement('ol');for(const line of chapter.items){const li=document.createElement('li');li.textContent=line;list.append(li)}
    article.append(eyebrow,title,list);track.append(article);
  }
  function update(index,scroll=false){const active=Math.max(0,Math.min(index,chapters.length-1));track.dataset.activeIndex=active;count.textContent=(active+1)+' / '+chapters.length+' · '+chapters[active].title;prev.disabled=active===0;next.disabled=active===chapters.length-1;if(scroll)track.scrollTo({left:active*track.clientWidth,behavior:'smooth'})}
  prev.onclick=()=>update((Number(track.dataset.activeIndex)||0)-1,true);
  next.onclick=()=>update((Number(track.dataset.activeIndex)||0)+1,true);
  track.addEventListener('scroll',()=>{if(track.clientWidth)update(Math.round(track.scrollLeft/track.clientWidth))},{passive:true});
  track.addEventListener('keydown',event=>{if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();update((Number(track.dataset.activeIndex)||0)+(event.key==='ArrowRight'?1:-1),true)}});
  update(0);
})();
