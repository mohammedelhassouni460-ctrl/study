import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const FAQ_ITEMS = [
  {
    q: "Quels types de documents puis-je importer ?",
    a: "Des PDF, des fichiers Word (.docx) et des fichiers texte (.txt), jusqu'à 15 Mo. Les PDF scannés (images sans texte) ne sont pas encore pris en charge.",
  },
  {
    q: "Mes cours restent-ils privés ?",
    a: "Oui. Tes documents sont stockés dans un espace privé, accessibles uniquement par ton compte. Ils ne sont jamais partagés avec d'autres utilisateurs et ne servent pas à entraîner de modèle d'IA.",
  },
  {
    q: "Qu'est-ce qu'un crédit IA ?",
    a: "Chaque génération consomme des crédits : 10 pour une fiche, un lot de flashcards ou un quiz, 25 pour un examen blanc et 1 par message au chat. Le plan Gratuit inclut 100 crédits par mois, le plan Pro 5 000.",
  },
  {
    q: "L'IA peut-elle se tromper ?",
    a: "Oui, comme tout outil d'IA. StudyOS s'appuie sur tes propres cours et cite ses sources dans le chat pour que tu puisses vérifier. En cas de doute, ton cours et ton professeur font foi.",
  },
  {
    q: "Puis-je résilier mon abonnement Pro ?",
    a: "À tout moment, en un clic depuis tes paramètres. Tu gardes l'accès Pro jusqu'à la fin de la période déjà payée.",
  },
  {
    q: "Comment fonctionne la répétition espacée ?",
    a: "Après chaque flashcard, tu indiques si c'était facile ou difficile. StudyOS te la repropose au moment idéal : bientôt si tu l'as oubliée, beaucoup plus tard si tu la maîtrises.",
  },
];

export function Faq() {
  return (
    <Accordion type="single" collapsible className="w-full">
      {FAQ_ITEMS.map((item, i) => (
        <AccordionItem key={i} value={`item-${i}`}>
          <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
          <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
