import { DuckWalk } from "#/components/duck-walk";

export function NotFound() {
    return (
        <div className="page">
            <header className="masthead">
                <a href="/">kyle.so</a>
            </header>
            <main className="lost">
                <h1 className="label">404</h1>
                <p>
                    Nothing lives at this address. Get Quack back to the house
                    and you’ll be home.
                </p>
                <DuckWalk />
                <p className="lost-keys">← → to walk, space to jump</p>
                <a className="lost-skip" href="/">
                    or skip the walk →
                </a>
            </main>
        </div>
    );
}
