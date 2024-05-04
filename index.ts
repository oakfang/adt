import { option, result, match, tasks } from "./lib";
import type { AnyTag, TaggerOf } from "./lib/tags";

interface User {
  id: string;
  name: string;
  age: number;
}

type DataBase = Record<User["id"], User>;

const db: DataBase = {
  "1": { id: "1", name: "Alice", age: 30 },
  "2": { id: "2", name: "Bob", age: 25 },
};

const getUser = (id: User["id"]) => {
  return tasks.Task.resolved(option.fromNullable(db[id]));
};

class UserExists extends Error {
  id: string;
  constructor(id: string) {
    super("User already exists");
    this.id = id;
  }
}

const insertUser = (user: Omit<User, "id">) =>
  tasks.Task.fromPromise(
    new Promise<string>((resolve) => {
      const id = Math.round(Math.random()).toString();
      if (db[id]) throw new UserExists(id);
      db[id] = { ...user, id };
      return resolve(id);
    }),
    (error) => {
      if (error instanceof UserExists) return error;

      return result.panic(error);
    }
  );

match(
  match(
    await getUser(
      match(await insertUser({ name: "Donna", age: 30 }).settled())
        .when(tasks.rejected<UserExists>, (err) => err.id)
        .when(tasks.resolved<string>, (id) => id)
        .assert()
    ).settled()
  )
    .when(tasks.resolved<option.Option<User>>, (user) => user)
    .assert()
)
  .when(option.none, () => console.log("No User"))
  .when(option.some<User>, (user) => console.log(user))
  .assert();
