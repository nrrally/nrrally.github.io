/* Original orientation copy, not regulations or competitor data. Review each season. */
(function () {
  'use strict';
  var sources = {
    nr: { title: '2026 Northern Regions Rally SSRs', edition: 'Version 2, 9 July 2026',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-NR-Regional-Rally-SSRs-V2-2.pdf' },
    national: { title: '2026 MSA National Rally SSRs', edition: 'Version 2, 9 July 2026; also contains provisions expressly covering NR',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-National-Rally-SSRs-V2.pdf' },
    gcr: { title: '2026 MSA General Competition Rules', edition: '15 January 2026',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/01/2026-MSA-General-Competition-Rules-GCRs-15.01.2026.pdf' },
    icam: { title: '2026 ICAM All Tar Rally SRs', edition: '21 March event; an example, not instructions for your next rally',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/03/21-Mar_2026-ICAM-All-Tar-Rally-SRs.pdf' },
    legends: { title: '2026 GR Legends Rally SRs', edition: '10 & 11 July event; an example of a two-day NR weekend',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/10-11-JUL-GR-LEGENDS-RALLY-SRs.pdf' },
    intro: { title: 'MSA: Getting started in rally racing', edition: 'General South African orientation; NR eligibility comes from the NR SSRs',
      url: 'https://www.motorsport.co.za/getting-started-in-rally-racing/' },
    msa: { title: 'MSA publications', edition: 'Check for current GCRs, medical and environmental codes',
      url: 'https://www.motorsport.co.za/publications/' },
    licence: { title: 'MSA Online licence portal', edition: 'Applications and current licensing information',
      url: 'https://msaonline.co.za/' },
    nrc: { title: 'NRC South Africa', edition: 'Official event portal: calendar, event documents and results; check which events include NR',
      url: 'https://nrcsa.co.za/home' }
  };
  function link(id, label) {
    return '<a href="' + sources[id].url + '" target="_blank" rel="noopener noreferrer">' + (label || sources[id].title) + '</a>';
  }
  function cite(id, locator) {
    return '<p class="guide-source">Source: ' + link(id) + ' &mdash; ' + locator + '.</p>';
  }
  var classes = [
    ['NR1', 'Forced induction, 1600&ndash;2500 cc, AWD; also S2000 vehicles and turbo rotary cars. Sequential or H-pattern gearboxes.'],
    ['NR2', 'Normally aspirated, 2050&ndash;3500 cc, 2WD or AWD; forced induction, 1600&ndash;2500 cc, 2WD; also non-turbo rotary cars.'],
    ['NR3', 'Normally aspirated, 1651&ndash;2050 cc, 2WD; also cars below 1651 cc with sequential gearboxes. H-pattern or full/partial sequential gearboxes.'],
    ['NR4', 'Normally aspirated, 1000&ndash;1650 cc, 2WD, H-pattern gearbox only.'],
    ['NR0', 'National cars, with a National licence. Optional NR entry for National cars; class points and trophies, not overall NR championship points.']
  ];
  var sections = [
    { id: 'watch', title: 'Come and watch first', label: 'Spectating',
      lead: '<p>Just come and watch. Find a Northern Regions event on the <a href="#/rounds">calendar</a> and look for its <strong>spectator guide</strong> on ' + link('nrc') + ' or the organiser&rsquo;s event page. It will help you choose where to go and when to arrive.</p>',
      summary: 'Plan a safe spectator day',
      detail: '<p>The guide shows spectator access, parking, viewing areas and expected times. Check for updates before travelling; if access information is missing, ask the organiser. A crew road book or results map is not a spectator access guide.</p>' +
        '<p>Stay in the designated viewing areas, behind barriers and clear of run-off areas. Follow marshals&rsquo; instructions: do not enter or cross a live stage, and wait for an official to say it is safe to move. A gap between cars does not mean the road is open.</p>' +
        '<p>Allow time for parking and walking, take weather protection and water, and keep children with you. Keep access routes clear, respect private property and take litter home. If open to visitors, the service park or finish can be another good place to watch and meet crews.</p>' +
        cite('national', 'safety-plan guidance, spectator areas and no-go areas') },
    { id: 'crew', title: 'Driver and co-driver: two different jobs', label: 'Your role',
      lead: '<p>If you would like to take part, there are two seats in a rally car. The <strong>driver</strong> drives; the <strong>co-driver</strong> navigates and manages the route and timing. Co-driving lets you join a crew without owning the car.</p>',
      summary: 'What each person prepares and does',
      detail: '<p>Only the nominated driver may control the car during an NR special stage. The driver prepares with the team, understands the car and follows traffic rules on linking roads. The co-driver reads the organiser&rsquo;s route information, presents the timecard and checks the next control and target time. Both learn the safety and emergency procedures.</p>' +
        '<p>Talk to an experienced NR crew or an MSA-affiliated rally club about getting involved. Helping in service or volunteering with the organiser is another way to learn. When joining a crew, agree who handles entries, documents, transport and service arrangements.</p>' +
        cite('nr', 'SSRs 4.1, 4.2 and 4.4') + cite('intro', 'crew roles and starting out') },
    { id: 'rules', title: 'Make the paperwork less mysterious', label: 'SRs & SSRs',
      lead: '<p><strong>GCRs</strong> are MSA&rsquo;s <strong>General Competition Rules</strong>, the common framework. <strong>SSRs</strong> are <strong>Standing Supplementary Regulations</strong>: the rally and championship rules for that edition. <strong>SRs</strong> are <strong>Supplementary Regulations</strong> for one named event.</p>',
      summary: 'What to read, and who to ask',
      detail: '<p>Read the <strong>NR Rally SSRs</strong> for eligibility, classes and championship structure, the applicable <strong>National Rally SSRs</strong> for shared rally procedures, and <strong>your event&rsquo;s SRs</strong> for entry deadlines, fees, venues and the programme.</p>' +
        '<p>Follow the official noticeboard named in the SRs for final instructions and numbered bulletins, and check applicable MSA circulars. These can change the arrangements. The 2026 NR SSRs say National rules prevail if they conflict with Regional rules.</p>' +
        '<p><strong>Ask the right person:</strong> the rally secretary/organiser for entries and schedules; the scrutineer or technical official for car/class/equipment eligibility; MSA for licensing; the Clerk of the Course (CoC) or Competitor Relations Officer, where appointed, for event procedures. Use the event documents to find the current contacts.</p>' +
        cite('nr', 'opening regulatory framework and amendment record') },
    { id: 'national-regional', title: 'National and Regional: shared sport, different championships', label: 'National & Regional',
      lead: '<p>National and Northern Regions crews share the same rally community and often the same events. National competition awards South African championship titles; Northern Regions awards Regional titles. Choose the programme that fits your crew and car.</p>',
      summary: 'Entry costs, classes, homologation and fuel',
      detail: '<p><strong>Entry fees are generally cheaper for an NR round</strong> in the 2026 event examples below. Compare like for like: an NR fee may be per day/round while a National entry covers two days. Notes, combined entries and other expenses also affect the weekend total. The event&rsquo;s SRs set the actual fees.</p>' +
        '<p><strong>Classes:</strong> National uses NRC1&ndash;NRC4; NR uses NR1&ndash;NR4 plus NR0 for National cars. Matching numbers do not mean matching eligibility or points. Each championship has its own SSRs alongside shared GCRs and rally procedures.</p>' +
        '<p><strong>Homologation</strong> is formal approval of a car specification. National rules include FIA/local homologation paths and specified legacy non-homologated vehicle paths. NR groups cars mainly by capacity, induction, drivetrain and gearbox, but technical, passport and safety rules still apply. A technical official can confirm the documents and permitted modifications for your car.</p>' +
        '<p><strong>Fuel wording differs.</strong> National SSR 910 specifies pump/control racing fuel, supply arrangements, purchase evidence and no additives for NRC entrants. NR SSR 11.3 allows broader choice within safety limits and GCR 240, with methanol prohibited except for specific MSA approval. Confirm your class, combined-entry and event rules before buying fuel.</p>' +
        cite('nr', 'SSRs 2&ndash;3, 7.1 and 11.3') + cite('national', 'SSRs 100, 801, 900&ndash;911') +
        cite('icam', 'SR 20, entry fee categories') + cite('legends', 'SR 20, National event versus NR per-day/round fees') },
    { id: 'ready', title: 'Before entering: licences, club, car and safety', label: 'Get ready',
      lead: '<p>To <strong>compete</strong>, both crew members need the appropriate MSA competition licence and a compliant car. For the 2026 NR championship, this means valid Regional licences and the specified domicile eligibility; NR0 uses a National licence.</p>',
      summary: '2026 classes and the safety conversation',
      detail: '<p><strong>Club membership is separate from licensing.</strong> Both driver and co-driver must be paid-up with an MSA-associated club before their first event entered to qualify for 2026 NR points. This is membership, not a separate &ldquo;club licence&rdquo;. NR1&ndash;NR4 accept Regional or one-event Regional licences for entry, but <strong>one-event licences do not count for the championship</strong>.</p>' +
        '<p>Apply through ' + link('licence') + '. MSA describes a Navigator&rsquo;s licence for co-driving; confirm the category and grade for your role, including any medical or age conditions. A competition licence is separate from a road driving licence. The NR domicile rule covers MSA&rsquo;s Northern Regions, Free State/Northern Cape and KwaZulu-Natal committee areas; ask MSA how it applies to you.</p>' +
        '<h3>Which NR class?</h3><p>This overview uses <strong>2026 NR SSR 3, Version 2</strong>. AWD means all-wheel drive; 2WD means front- or rear-wheel drive. Normally aspirated means no forced induction, such as a turbo.</p>' +
        '<div class="table-wrap"><table class="data guide-classes"><caption>2026 Northern Regions class overview</caption><thead><tr><th scope="col">Class</th><th scope="col">Starting point for a discussion with the technical official</th></tr></thead><tbody>' +
        classes.map(function (c) { return '<tr><th scope="row">' + c[0] + '</th><td>' + c[1] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
        '<p>Before buying or building, have a technical official confirm the car, modifications and class. Unusual vehicles need particular care: NR SSR 5 requires prior NRC Technical Panel approval for certain bakkie entries.</p>' +
        '<h3>Car and crew safety</h3><p>The car needs a compliant roll cage, seats and mountings, harnesses, extinguisher/system, medical kit and secured equipment. It must also meet public-road requirements for travel between stages. Check its technical passport and any required sealing or marking.</p>' +
        '<p>Both crew members need correctly fitting, approved helmets, fire-resistant clothing and applicable head restraints. National Rally SSR 600 includes <strong>NR1/NR2-specific seat, harness and frontal head restraint provisions</strong>. Have the scrutineer check the full requirements for your class, including labels, condition, validity and any extensions, before purchasing equipment.</p>' +
        '<p>Learn how to use the harness cutters, medical-aid/OK board, warning triangle and fire equipment before the weekend. The crew remains responsible for compliance even after scrutineering.</p>' +
        cite('nr', 'SSRs 2.2, 2.3, 3&ndash;5 and 11') + cite('national', 'SSR 600, especially 600.2, 600.3 and 600.6') +
        cite('gcr', 'GCRs 239, 254, 256 and 257') + cite('intro', 'car preparation and public-road compliance') },
    { id: 'before', title: 'Before the rally weekend', label: 'Enter & prepare',
      lead: '<p>Once the crew and car are ready, choose the event and check which <strong>NR round or rounds</strong> it includes. Download its SRs, read the programme and submit the entry through the organiser&rsquo;s stated process before the closing date. Check acceptance, not just that you sent a form.</p>',
      summary: 'A manageable pre-event plan',
      detail: '<p><strong>Make one shared checklist:</strong> entry and payment confirmation, crew documents, scrutiny form and safety kit, transport and accommodation, fuel, tyres, spares and service arrangements. Agree a budget with your team.</p>' +
        '<p>Follow the event&rsquo;s documentation list. For example, the March 2026 ICAM SRs required electronic submission of an MSA licence, driver&rsquo;s licence, medical information and entry application. Send personal information only through the organiser&rsquo;s official process.</p>' +
        '<p>Read the road book, itinerary (time-and-distance schedule) and service information when issued. Save them for areas with poor reception, and agree where the service crew may work and how to contact them.</p>' +
        '<p><strong>Reconnaissance</strong> is a permitted look at the route, not practice. NR SSR 10.1 prohibits practising subject to its stated exception; pace notes need ratification and the road book takes precedence. Do not independently drive stages to learn them. If reconnaissance is offered, follow the event&rsquo;s timetable, vehicle and conduct rules: GR Legends offered an optional single pass, while ICAM limited it to specified stages.</p>' +
        cite('icam', 'SRs 20&ndash;26 and 39') + cite('legends', 'SRs 21 and 38') + cite('nr', 'SSRs 10.1 and 10.2') },
    { id: 'arrival', title: 'Arrive, check in, get cleared to start', label: 'At the venue',
      lead: '<p>Find Rally HQ and the service area, then follow the pre-start programme: documentation, scrutiny, any tracking-equipment fitting and the compulsory competitors&rsquo; briefing.</p>',
      summary: 'What the pre-start checks mean',
      detail: '<p><strong>Documentation</strong> confirms your entry and crew paperwork. <strong>Scrutineering</strong> checks the car and safety equipment. The SRs may require a self-scrutineering declaration, appointment and technical marking/sealing; resolve any problems before starting.</p>' +
        '<p><strong>Both crew members attend the briefing.</strong> NR SSR 9 makes it compulsory and treats late arrival as non-attendance. Listen for safety instructions and changes, and ask about any unfamiliar procedures.</p>' +
        '<p>Check the official start list and holding-area instructions. <strong>Parc ferme</strong> is a controlled area with restricted work and access. On a two-day weekend, check the next morning&rsquo;s requirements too: GR Legends 2026 scheduled another briefing, documentation and re-scrutiny.</p>' +
        cite('nr', 'SSRs 5.3 and 9') + cite('icam', 'SRs 21&ndash;28') + cite('legends', 'SRs 21&ndash;27') },
    { id: 'during', title: 'During the rally: route, clocks and service', label: 'On the route',
      lead: '<p>A rally alternates <strong>special stages</strong> &mdash; timed tests on closed roads &mdash; with <strong>road/open (liaison) sections</strong> linking the route. Linking sections are not races: obey traffic rules and follow the schedule. Results combine stage times and applicable penalties.</p>',
      summary: 'Follow one cycle from start to the next control',
      detail: '<ol class="guide-steps"><li><strong>Read the road book and timecard.</strong> The road book gives the route; the timecard records your passage and times at controls. Visit them in the prescribed order.</li>' +
        '<li><strong>Check in at the time control (TC).</strong> The marshal records when you present the card. TC check-in and the following stage start are separate: do not assume they have the same target time. Learn the event&rsquo;s card and allowed times with an experienced co-driver or official. Early and late check-ins can both incur penalties.</li>' +
        '<li><strong>Start at the assigned time.</strong> Stage time is the elapsed time from the start to the flying finish. At the separate stop control, stop to have that time entered on the card.</li>' +
        '<li><strong>Continue on the linking route.</strong> Check the next instruction, target time and any bulletin changes. The crew is responsible for the timecard, presenting it and checking entries. Ask an official to correct an error; do not alter recorded times yourself.</li>' +
        '<li><strong>Service or regroup when instructed.</strong> Service allows maintenance in designated areas; regrouping brings the field together and is not automatically a repair opportunity. Follow controls, refuelling and environmental rules, and the assigned restart time.</li></ol>' +
        '<p>NR SSR 10.1.3 describes start-to-start road-section timing, while SSR 10.2(e) requires pre-stage dead time. Use the actual card and briefing to establish TC check-in times, rather than deriving them from stage-start targets.</p>' +
        '<p>Serious breaches can lead to exclusion or being time-barred. Do not race on open roads to recover lateness. For breakdowns, accidents or missed stages, contact an official and follow the event&rsquo;s emergency or retirement procedure. Rejoining needs the prescribed permission and safety checks.</p>' +
        '<p>Learn the medical-aid/OK-board procedure before starting. The National SSRs require stopping to assist at an accident where a red cross is displayed or no medical-aid board is displayed. Know how to report the location to officials.</p>' +
        cite('nr', 'SSRs 10.1.3 and 10.2') + cite('national', 'SSRs 401&ndash;405, 500&ndash;502, 508, 516 and 600.10') },
    { id: 'after', title: 'At the finish and after the weekend', label: 'Finish & reset',
      lead: '<p>Complete the finish controls, return the timecard and required incident report, and follow parc-ferme instructions. Check the <strong>official provisional classification</strong>; results can change before becoming final.</p>',
      summary: 'Close the event properly, then prepare for the next one',
      detail: '<p>Check your crew, class, stage times and penalties promptly. Raise queries with the appropriate official and follow the SRs&rsquo; protest procedure and deadlines. Reporting an error to this site is <em>not</em> a protest or appeal.</p>' +
        '<p>Wait for car release and any required technical checks before loading up. If you retire, return the timecard/incident report and arrange recovery through an official.</p>' +
        '<p><strong>Between events:</strong> inspect and repair the car, check safety equipment after incidents, replenish the medical kit and review timing or navigation problems with your crew. Update the budget and next-entry checklist.</p>' +
        '<p>Use ' + link('nrc', 'official results') + ' and MSA/Series Controllers&rsquo; standings for decisions. This site&rsquo;s <a href="#/standings">standings</a> and <a href="#/rounds">stage graphs</a> are independently derived review tools.</p>' +
        cite('national', 'SSR 501, timecards and incident reports') + cite('icam', 'SRs 21, 27 and 32&ndash;34') +
        cite('legends', 'SRs 21 and 31&ndash;33') },
    { id: 'season', title: 'How a Northern Regions year fits together', label: 'The season',
      lead: '<p>A season is made up of events and scoring rounds. A two-day weekend can have separate NR rounds and classifications, as at GR Legends 2026, even when sharing the event with a National rally. Check the NR calendar and event SRs for the rounds you are entering.</p>',
      summary: '2026 championship context and planning the next year',
      detail: '<p><strong>Championship eligibility includes a minimum number of round starts</strong>; check that season&rsquo;s threshold in NR SSRs 4.3 and 7.4. You can still try a single event. <strong>Entering does not establish a start</strong>, finish or entitlement to points.</p>' +
        '<p>Driver and co-driver championships are separate: points in one role do not count in the other. The 2026 NR rules add per-round overall and class points for overall scoring; NR0 earns class points only. SSRs 6 and 7 give the scale, conditions and tie rules. This site retains scoring and participation evidence in <a href="#/about">Sources</a>, <a href="#/standings">standings</a> and crew profiles.</p>' +
        '<p><strong>Start of year:</strong> read the new rules, renew licences and club membership, check car/class and equipment validity, and agree crew availability and budget. Choose achievable events and keep an eye on calendar updates.</p>' +
        '<p><strong>Year end:</strong> check final official standings and awards, review the season with your crew, and plan maintenance and entries. Rules can change: the July National SSRs already announce safety changes for 2027.</p>' +
        cite('nr', 'SSRs 4.3, 6 and 7') }
  ];
  var edition = { year: 2026, checked: '8 November 2026' };
  function view() {
    var html = '<article class="getting-started"><div class="page-head"><div><p class="eyebrow">Northern Regions &middot; a first rally, one step at a time</p>' +
      '<h1>Getting started in NR Rally</h1><p>Come watch a Northern Regions rally and enjoy the day. If you later want to join a crew, this guide takes you through preparing, entering and taking part.</p></div></div>' +
      '<p class="guide-edition"><strong>Reference edition: ' + edition.year + '.</strong> Checked ' + edition.checked + '; not verified for other seasons. Use your event&rsquo;s current regulations and bulletins.</p>' +
      '<nav class="guide-jumps" aria-label="Getting started topics">' + sections.map(function (s) {
        return '<a href="#/getting-started/' + s.id + '">' + s.label + '</a>';
      }).join('') + '</nav>';
    sections.forEach(function (s, i) {
      html += '<section class="section guide-section" aria-labelledby="guide-' + s.id + '"><div class="section-head"><h2 id="guide-' + s.id + '" tabindex="-1">' +
        (i + 1) + '. ' + s.title + '</h2></div><div class="card guide-copy">' + s.lead +
        '<details><summary>' + s.summary + '</summary><div class="guide-detail">' + s.detail + '</div></details></div></section>';
    });
    html += '<section class="section guide-section" aria-labelledby="guide-references"><div class="section-head"><h2 id="guide-references" tabindex="-1">Official references</h2></div>' +
      '<div class="card guide-copy"><p>This independent guide uses <strong>' + edition.year + ' rules, checked ' + edition.checked + '</strong>; it is not a substitute for the current SSRs, event SRs and bulletins. Event examples illustrate arrangements that can vary.</p><ul class="guide-references">' +
      Object.keys(sources).map(function (id) { return '<li>' + link(id) + '<span>' + sources[id].edition + '</span></li>'; }).join('') +
      '</ul><p>The NR and National SSRs have differing NR event-count wording. Use the calendar and Series Controllers&rsquo; updates for the current programme.</p>' +
      '<p><a class="btn" href="#/rounds">Find an event &amp; its documents</a> <a class="btn" href="#/info">Regulations &amp; site info</a></p></div></section></article>';
    return { title: 'Getting started in NR Rally', html: html };
  }
  window.NRGettingStarted = { edition: edition, view: view };
})();
