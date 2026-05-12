
export interface MPContact {
  constituency: string;
  county: string;
  name: string;
  email: string;
  role: string;
}

export const MP_CONTACTS: MPContact[] = [
  { constituency: "Lang'ata", county: "Nairobi", name: "Hon. Phelix Odiwuor", email: "langata@parliament.go.ke", role: "MP" },
  { constituency: "Kibra", county: "Nairobi", name: "Hon. Peter Orero", email: "kibra@parliament.go.ke", role: "MP" },
  { constituency: "Westlands", county: "Nairobi", name: "Hon. Tim Wanyonyi", email: "westlands@parliament.go.ke", role: "MP" },
  { constituency: "Dagoretti North", county: "Nairobi", name: "Hon. Beatrice Elachi", email: "dagorettin@parliament.go.ke", role: "MP" },
  { constituency: "Embakasi East", county: "Nairobi", name: "Hon. Babu Owino", email: "embakasie@parliament.go.ke", role: "MP" },
  { constituency: "Githunguri", county: "Kiambu", name: "Hon. Gathoni Wamuchomba", email: "githunguri@parliament.go.ke", role: "MP" },
  { constituency: "Mvita", county: "Mombasa", name: "Hon. Mohamed Machele", email: "mvita@parliament.go.ke", role: "MP" },
  { constituency: "Kisumu Central", county: "Kisumu", name: "Hon. Joshua Oron", email: "kisumuc@parliament.go.ke", role: "MP" },
  { constituency: "Generic", county: "National", name: "Member of Parliament", email: "clerk@parliament.go.ke", role: "MP" }
];

export const getMPByConstituency = (constituencyName: string) => {
  return MP_CONTACTS.find(mp => mp.constituency.toLowerCase() === constituencyName.toLowerCase()) || MP_CONTACTS[MP_CONTACTS.length - 1];
};
