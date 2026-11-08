/* Original orientation copy, not regulations or competitor data. Review each season. */
(function () {
  'use strict';
  var sources = {
    nr: { title: '2026 Northern Regions Rally SSRs', edition: 'Version 2, 9 July 2026',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-NR-Regional-Rally-SSRs-V2-2.pdf' },
    national: { title: '2026 MSA National Rally SSRs', edition: 'Version 2, 9 July 2026; includes provisions covering NR',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/07/2026-MSA-National-Rally-SSRs-V2.pdf' },
    gcr: { title: '2026 MSA General Competition Rules', edition: '15 January 2026',
      url: 'https://www.motorsport.co.za/wp-content/uploads/2026/01/2026-MSA-General-Competition-Rules-GCRs-15.01.2026.pdf' },
    intro: { title: 'MSA: Getting started in rally racing', edition: 'General South African orientation',
      url: 'https://www.motorsport.co.za/getting-started-in-rally-racing/' },
    msa: { title: 'MSA publications', edition: 'Find current regulations and codes',
      url: 'https://www.motorsport.co.za/publications/' },
    licence: { title: 'MSA Online licence portal', edition: 'Applications and licensing information',
      url: 'https://msaonline.co.za/' },
    nrc: { title: 'NRC South Africa', edition: 'Calendar, event documents and results; check which events include NR',
      url: 'https://nrcsa.co.za/home' }
  };
  function link(id, label) {
    return '<a href="' + sources[id].url + '" target="_blank" rel="noopener noreferrer">' + (label || sources[id].title) + '</a>';
  }
  var sections = [
    { id: 'watch', title: 'Come and watch first', label: 'Spectating',
      lead: '<p>Just come and watch. Find a Northern Regions event on the <a href="#/rounds">calendar</a> and look for its <strong>spectator guide</strong> on ' + link('nrc') + ' or the organiser&rsquo;s event page.</p>',
      summary: 'Plan a safe spectator day',
      detail: '<p>Check the guide for access, parking, viewing areas and updates before travelling. If information is missing, ask the organiser.</p>' +
        '<p>Stay in designated viewing areas, clear of run-off areas, and follow marshals&rsquo; instructions. Do not enter or cross a live stage; wait for an official to say it is safe. A gap between cars does not mean the road is open.</p>' +
        '<p>Take water and weather protection, keep children with you, respect private property and take litter home. If open to visitors, the service park or finish can be a good place to meet crews.</p>' },
    { id: 'crew', title: 'Driver and co-driver: two different jobs', label: 'Your role',
      lead: '<p>The <strong>driver</strong> drives; the <strong>co-driver</strong> navigates and helps manage the route and timing. Co-driving lets you join a crew without owning the car.</p>',
      summary: 'Find your way into the sport',
      detail: '<p>Talk to an experienced NR crew or an MSA-affiliated rally club. Helping a service crew or volunteering with an organiser is another way to learn. Agree with your crew how you will share preparation, costs and responsibilities.</p>' },
    { id: 'rules', title: 'Make the paperwork less mysterious', label: 'SRs & SSRs',
      lead: '<p><strong>GCRs</strong> are MSA&rsquo;s General Competition Rules. <strong>SSRs</strong> are Standing Supplementary Regulations for a championship or discipline. <strong>SRs</strong> are Supplementary Regulations for an event.</p>',
      summary: 'What to read, and who to ask',
      detail: '<p>Start with the applicable NR and National Rally SSRs for championship and shared rally rules. Check each event&rsquo;s SRs and official bulletins for its arrangements. Regulations can change, so use the current documents.</p>' +
        '<p>Ask MSA about licensing, a technical official about car and equipment eligibility, and the organiser about an event&rsquo;s entries and programme.</p>' },
    { id: 'national-regional', title: 'National and Regional: shared sport, different championships', label: 'National & Regional',
      lead: '<p>National and Northern Regions crews share the same rally community and often the same events. National competition awards South African championship titles; Northern Regions awards Regional titles. Choose the programme that fits your crew and car.</p>',
      summary: 'Costs, classes, homologation and fuel',
      detail: '<p>Entry fees are generally cheaper for Regional competition, but compare what each entry covers and allow for other costs. The event&rsquo;s SRs set the fees.</p>' +
        '<p>The ' + link('national', '2026 National SSRs') + ' set out NRC1&ndash;NRC4 using specified vehicle categories and technical requirements. The ' + link('nr', '2026 NR SSRs') + ' describe NR1&ndash;NR4 using factors including engine capacity, induction, drivetrain and gearbox; NR0 is an optional class for National cars, with class points but no overall NR points. Matching numbers do not mean matching eligibility. The National SSRs also contain NR provisions, so check both with a technical official before choosing a class.</p>' +
        '<p><strong>Homologation</strong> is formal approval of a car specification. National rules include homologation and specified non-homologated vehicle paths; NR classes group cars by characteristics such as capacity, induction, drivetrain and gearbox. Technical and safety requirements still apply. Ask a technical official about your car.</p>' +
        '<p><strong>Fuel:</strong> the 2026 National SSRs restrict NRC entrants to specified pump or control racing fuel, with supply and purchase requirements and no additives. The 2026 NR SSRs allow broader fuel choice within safety limits, prohibit methanol without specific MSA approval and refer to GCR 240. Check the applicable championship, class and event regulations, particularly if entering both, before buying fuel.</p>' },
    { id: 'ready', title: 'Get your crew and car ready', label: 'Get ready',
      lead: '<p>To <strong>compete</strong>, both crew members need appropriate competition licences and a compliant car. Check the current championship rules for licence, club membership and eligibility requirements.</p>',
      summary: 'Licences, class and safety',
      detail: '<p>Licensing and club membership are separate. Check whether your licence qualifies you for championship points: an entry licence does not necessarily do so. Apply through ' + link('licence') + ' and ask MSA about the requirements for your role.</p>' +
        '<p>Before buying or building a car, discuss its class, modifications and documentation with a technical official. Plan for compliant car safety equipment and properly fitting, approved crew equipment; requirements depend on the applicable regulations and class.</p>' +
        '<p>Learn how to use your safety equipment and follow the event&rsquo;s emergency instructions. The crew remains responsible for compliance.</p>' },
    { id: 'before', title: 'Plan your season', label: 'Enter & prepare',
      lead: '<p>Look at the <a href="#/rounds">calendar</a>, choose events that fit your budget and availability, and check which NR rounds they include. Allow for preparation, travel, service and maintenance as well as entry fees.</p>',
      summary: 'Preparing for events',
      detail: '<p>For each event, read its SRs, enter through the organiser&rsquo;s stated process and confirm acceptance. Share a checklist for documents, equipment, transport and service. Send personal information only through the organiser&rsquo;s official process.</p>' +
        '<p>Read the route and service information when provided. Any reconnaissance is subject to the applicable rules and event instructions; do not independently practise on stages.</p>' },
    { id: 'arrival', title: 'At an event', label: 'At the venue',
      lead: '<p>Follow the organiser&rsquo;s programme for documentation, scrutineering and any briefing. Check official updates and ask an official if anything is unclear.</p>',
      summary: 'Getting ready to start',
      detail: '<p>Documentation checks the entry and crew paperwork; scrutineering checks the car and safety equipment. Allow time to resolve any issues, and listen for changes and safety instructions at the briefing.</p>' +
        '<p>Check the official start information and instructions for controlled areas. Parc ferme is an area where access and work on cars are restricted. Arrangements can vary between events and rounds.</p>' },
    { id: 'during', title: 'On the route', label: 'On the route',
      lead: '<p>A rally combines timed <strong>special stages</strong> with road sections linking the route. Road sections are not races: obey traffic rules and follow the organiser&rsquo;s instructions.</p>',
      summary: 'Stages, controls and service',
      detail: '<p>The road book describes the route; the timecard records passage and times at controls. The crew follows the prescribed order, checking in at time controls and starting stages as instructed. A time-control check-in and a stage start are separate: learn the timing from the event instructions and an experienced co-driver or official.</p>' +
        '<p>A stage runs from its start to the flying finish; crews then stop at the designated control. Stage times and applicable penalties contribute to the classification. Service allows maintenance in designated areas; regrouping brings the field together and is not automatically a chance to work on the car.</p>' +
        '<p>Learn the emergency and retirement procedures before starting. If there is a breakdown or incident, follow the safety instructions and contact an official. Do not race on open roads to recover time.</p>' },
    { id: 'after', title: 'After each event', label: 'Finish & reset',
      lead: '<p>Follow the finish or retirement instructions and check the official classification. Provisional results can change before becoming final.</p>',
      summary: 'Review and prepare for the next round',
      detail: '<p>Complete the required finish controls and paperwork, and wait for permission before removing a car from a controlled area. If you retire, follow the organiser&rsquo;s reporting and recovery instructions.</p>' +
        '<p>Raise any result queries with the appropriate official within the applicable deadlines; reporting an error to this site is not a protest or appeal. Between events, review the weekend with your crew and attend to the car and equipment.</p>' +
        '<p>Use ' + link('nrc', 'official results') + ' and MSA or Series Controllers&rsquo; standings for decisions. This site&rsquo;s <a href="#/standings">standings</a> and <a href="#/rounds">stage graphs</a> are independently derived review tools.</p>' },
    { id: 'season', title: 'How a Northern Regions year fits together', label: 'The season',
      lead: '<p>A season is made up of events and scoring rounds. Some two-day weekends have separate NR rounds and classifications. Check the calendar and event SRs for the rounds you are entering.</p>',
      summary: 'Points, eligibility and planning ahead',
      detail: '<p><strong>Entering does not establish a start</strong>, finish or entitlement to points. Championship eligibility can include a minimum number of round starts and other conditions; check the applicable season&rsquo;s SSRs.</p>' +
        '<p>Driver and co-driver championships are separate, and overall and class points depend on the championship rules. Check the official standings and regulations; this site also provides <a href="#/about">Sources</a>, <a href="#/standings">standings</a> and crew profiles.</p>' +
        '<p>At the start of each year, review the rules, licences, membership, car and equipment before planning your events. At the end, review the season and plan maintenance with your crew.</p>' }
  ];
  var edition = { year: 2026, checked: '8 November 2026' };
  function view() {
    var html = '<article class="getting-started"><div class="page-head"><div><p class="eyebrow">Northern Regions &middot; a season of rallying</p>' +
      '<h1>Getting started in NR Rally</h1><p>Come watch a Northern Regions rally and enjoy the day. If you later want to join a crew, this guide introduces the sport and the season ahead.</p></div></div>' +
      '<nav class="guide-jumps" aria-label="Getting started topics">' + sections.map(function (s) {
        return '<a href="#/getting-started/' + s.id + '">' + s.label + '</a>';
      }).join('') + '</nav>';
    sections.forEach(function (s, i) {
      html += '<section class="section guide-section" aria-labelledby="guide-' + s.id + '"><div class="section-head"><h2 id="guide-' + s.id + '" tabindex="-1">' +
        (i + 1) + '. ' + s.title + '</h2></div><div class="card guide-copy">' + s.lead +
        '<details><summary>' + s.summary + '</summary><div class="guide-detail">' + s.detail + '</div></details></div></section>';
    });
    html += '<section class="section guide-section" aria-labelledby="guide-references"><div class="section-head"><h2 id="guide-references" tabindex="-1">Official references</h2></div>' +
      '<div class="card guide-copy"><p>This independent guide is an introduction, not an eligibility decision. Check the current regulations and event bulletins.</p><ul class="guide-references">' +
      Object.keys(sources).map(function (id) { return '<li>' + link(id) + '<span>' + sources[id].edition + '</span></li>'; }).join('') +
      '</ul><p><a class="btn" href="#/rounds">Find an event &amp; its documents</a> <a class="btn" href="#/info">Regulations &amp; site info</a></p></div></section></article>';
    return { title: 'Getting started in NR Rally', html: html };
  }
  window.NRGettingStarted = { edition: edition, view: view };
})();
