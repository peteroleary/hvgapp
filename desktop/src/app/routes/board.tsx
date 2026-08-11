import { createFileRoute } from "@tanstack/react-router";

import { BoardScreen } from "@/features/board/BoardScreen";

export const Route = createFileRoute("/board")({
  component: BoardScreen,
});
