/** The privacy page (SPEC.md §10.2). Written by agents, pre-approved by the author on 2026-10-05. */
export const privacy = {
  title: "Privacy",
  intro: "Quits non ha account. Qui trovi cosa viene salvato, dove, per quanto tempo e come cancellarlo.",
  storedH: "Cosa viene salvato",
  stored: [
    "Quello che inserisci in un viaggio: il nome del viaggio, i nomi dei partecipanti, le spese con importi, descrizioni, categorie e date, i pagamenti.",
    "Un identificativo anonimo del dispositivo, scritto in ogni modifica. Non contiene dati personali e serve solo a distinguere i dispositivi di uno stesso viaggio.",
    "Sul server il link del viaggio è conservato solo come impronta (hash SHA-256), mai in chiaro.",
    "Su questo dispositivo restano i viaggi, chi sei in ognuno, la lingua, il tema e le modifiche non ancora inviate. Sono dati tecnici necessari al funzionamento, per questo non c'è un banner dei cookie.",
    "I font sono ospitati da Quits: nessuna richiesta parte verso Google Fonts. Solo la pagina iniziale può misurare le visite con Cloudflare Web Analytics, che non usa cookie. Dentro l'app non c'è nessuna analisi.",
  ],
  whereH: "Dove",
  where:
    "I viaggi sono conservati in Durable Objects di Cloudflare nella giurisdizione UE. Ogni richiesta passa comunque dalla rete Cloudflare più vicina a te, che può trovarsi fuori dall'UE.",
  howLongH: "Per quanto tempo",
  howLong:
    "Un viaggio resta finché qualcuno del viaggio non lo elimina, anche se è chiuso: non c'è nessuna cancellazione automatica. Un viaggio eliminato si può ripristinare per 30 giorni, poi viene cancellato definitivamente. Dopo la cancellazione definitiva, copie tecniche possono restare per altri 30 giorni al massimo nel ripristino a un punto nel tempo (point-in-time recovery) di Cloudflare.",
  deleteH: "Come cancellare",
  delete:
    "Chiunque abbia il link può eliminare il viaggio dall'app. Per toglierti da un viaggio senza eliminarlo, rinomina il tuo nome: le modifiche già fatte restano nella cronologia del viaggio.",
  exportH: "Come esportare",
  export: "Dalla scheda Viaggio scarichi le spese in CSV e un backup JSON di tutte le operazioni del viaggio.",
  logsH: "Log e link",
  logs:
    "Il codice di Quits non registra indirizzi IP né il link del viaggio. I log del server contengono solo errori, senza intestazioni e senza il contenuto delle operazioni. Il link sta nel frammento dell'indirizzo, che il browser non invia al server, e viaggia solo nell'intestazione Authorization.",
  cloudflareH: "Cloudflare",
  cloudflare:
    "Cloudflare, come fornitore dell'infrastruttura, tratta i metadati tecnici delle richieste (per esempio l'indirizzo IP) secondo la propria informativa.",
  cloudflareLink: "Informativa sulla privacy di Cloudflare",
  contactH: "Contatti",
  contact: "Per chiedere la cancellazione di un viaggio o per qualsiasi dubbio scrivi a",
};
