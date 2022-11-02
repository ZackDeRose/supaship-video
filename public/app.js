// initializing Supabase Client

const { createClient } = supabase;

const supaUrl = "https://nsoshujdavrbnwaqryzs.supabase.co";
const supaAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zb3NodWpkYXZyYm53YXFyeXpzIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NjczMzg4MzMsImV4cCI6MTk4MjkxNDgzM30.Ud8BnrZZqYHp6nICL7i_6LLC1Lxd3vfDbulDvJ7oJKM";

const supaClient = createClient(supaUrl, supaAnonKey);

// html elements

const loginButon = document.getElementById("signInBtn");
const logoutButton = document.getElementById("signOutBtn");
const whenSignedIn = document.getElementById("whenSignedIn");
const whenSignedOut = document.getElementById("whenSignedOut");
const userDetails = document.getElementById("userDetails");
const myThingsSection = document.getElementById("myThings");
const myThingsList = document.getElementById("myThingsList");
const allThingsSection = document.getElementById("allThings");
const allThingsList = document.getElementById("allThingsList");
const createThing = document.getElementById("createThing");

// Event Listeners

loginButon.addEventListener("click", () => {
  supaClient.auth.signInWithOAuth({
    provider: "google",
  });
});

createThing.addEventListener("click", async () => {
  const {
    data: { user },
  } = await supaClient.auth.getUser();
  const thing = createRandomThing(user);
  await supaClient.from("things").insert([thing]);
});

logoutButton.addEventListener("click", () => {
  supaClient.auth.signOut();
});

// init

checkUserOnStartUp();
let myThingsSubscription;
const myThings = {};
const allThings = {};
getAllInitialThings().then(() => listenToAllThings());

supaClient.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    adjustForUser(session.user);
  } else {
    adjustForNoUser();
  }
});

// function declarations

async function checkUserOnStartUp() {
  const {
    data: { user },
  } = await supaClient.auth.getUser();
  if (user) {
    adjustForUser(user);
  } else {
    adjustForNoUser();
  }
}

async function adjustForUser(user) {
  whenSignedIn.hidden = false;
  whenSignedOut.hidden = true;
  myThingsSection.hidden = false;
  userDetails.innerHTML = `
<h3>Hi ${user.user_metadata.full_name}</h3>
<img src="${user.user_metadata.avatar_url}" />
<p>UID: ${user.id}</p>`;
  await getMyInitialThings(user);
  listenToMyThingsChanges(user);
}

function adjustForNoUser() {
  whenSignedIn.hidden = true;
  whenSignedOut.hidden = false;
  myThingsSection.hidden = true;
  if (myThingsSubscription) {
    myThingsSubscription.unsubscribe();
    myThingsSubscription = null;
  }
}

async function getAllInitialThings() {
  const { data } = await supaClient.from("things").select();
  for (const thing of data) {
    allThings[thing.id] = thing;
  }
  renderAllThings();
}

function renderAllThings() {
  const tableHeader = `
<thead>
  <tr>
    <th>Name</th>
    <th>Weight</th>
  </tr>
</thead>`;
  const tableBody = Object.values(allThings)
    .sort((a, b) => (a.weight > b.weight ? -1 : 1))
    .map((thing) => {
      return `
<tr>
  <td>${thing.name}</td>
  <td>${thing.weight} lbs.</td>
</tr>`;
    })
    .join("");
  const table = `
<table class="table table-striped">
  ${tableHeader}
  <tbody>${tableBody}</tbody>
</table>`;
  allThingsList.innerHTML = table;
}

function createRandomThing(user) {
  if (!user) {
    console.error("Must be signed in to create a thing");
    return;
  }
  return {
    name: faker.commerce.productName(3),
    weight: Math.round(Math.random() * 100),
    owner: user.id,
  };
}

function handleAllThingsUpdate(update) {
  if (update.eventType === "DELETE") {
    delete allThings[update.old.id];
  } else {
    allThings[update.new.id] = update.new;
  }
  renderAllThings();
}

function listenToAllThings() {
  supaClient
    .channel(`public:things`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "things" },
      handleAllThingsUpdate
    )
    .subscribe();
}

async function getMyInitialThings(user) {
  const { data } = await supaClient
    .from("things")
    .select("*")
    .eq("owner", user.id);
  for (const thing of data) {
    myThings[thing.id] = thing;
  }
  renderMyThings();
}

function handleMyThingsUpdate(update) {
  if (update.eventType === "DELETE") {
    delete myThings[update.old.id];
  } else {
    myThings[update.new.id] = update.new;
  }
  renderMyThings();
}

async function listenToMyThingsChanges(user) {
  if (myThingsSubscription) {
    return;
  }
  myThingsSubscription = supaClient
    .channel(`public:things:owner=eq.${user.id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "things",
        filter: `owner=eq.${user.id}`,
      },
      handleMyThingsUpdate
    )
    .subscribe();
}

function renderMyThings() {
  const tableHeader = `
<thead>
  <tr>
    <th>Name</th>
    <th>Weight</th>
    <th></th>
  </tr>
</thead>`;
  const tableContents = Object.values(myThings)
    .sort((a, b) => (a.weight > b.weight ? -1 : 1))
    .map((thing) => {
      console.log(thing);
      return `
<tr>
  <td>${thing.name}</td>
  <td>${thing.weight} lbs.</td>
  <td>${deleteButtonTemplate(thing)}</td>
</tr>`;
    })
    .join("");
  const table = `
<table class="table table-striped">
  ${tableHeader}
  <tbody>${tableContents}</tbody>
</table>`;
  myThingsList.innerHTML = table;
}
6;

function deleteButtonTemplate(thing) {
  return `
<button
  onclick="deleteAtId(${thing.id})"
  class="btn btn-outline-danger"
>
    ${trashIcon}
</button>`;
}

async function deleteAtId(id) {
  await supaClient.from("things").delete().eq("id", id);
}

const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
  <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
</svg>`;
