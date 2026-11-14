import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/uploads/upload-api.ts", async () => {
  const actual =
    await vi.importActual<typeof import("@/uploads/upload-api.ts")>("@/uploads/upload-api.ts");
  return {
    ...actual,
    getDefaultChecklist: vi.fn(),
    requestPresignedUploads: vi.fn(),
    putToS3: vi.fn(),
  };
});
vi.mock("@/advisors/advisors-api.ts", () => ({ getAdvisors: vi.fn() }));

const { getDefaultChecklist, requestPresignedUploads, putToS3 } = await import(
  "@/uploads/upload-api.ts"
);
const { getAdvisors } = await import("@/advisors/advisors-api.ts");
const { default: UploadDialog } = await import("../upload-dialog.tsx");

const mockChecklist = vi.mocked(getDefaultChecklist);
const mockPresign = vi.mocked(requestPresignedUploads);
const mockPut = vi.mocked(putToS3);
const mockAdvisors = vi.mocked(getAdvisors);

const advisor = {
  id: "adv-1",
  employeeId: "E001",
  fullName: "Alice Tan",
  email: "alice@example.com",
  department: "Wealth",
};

function mp3(name: string, size = 3) {
  return new File([new Uint8Array(size)], name, { type: "audio/mpeg", lastModified: 1 });
}

function renderDialog() {
  const onOpenChange = vi.fn();
  const onUploaded = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <UploadDialog open onOpenChange={onOpenChange} onUploaded={onUploaded} />
    </QueryClientProvider>,
  );
  return { onOpenChange, onUploaded };
}

function fileInput() {
  return document.querySelector('input[type="file"]') as HTMLInputElement;
}

async function pick(...files: File[]) {
  fireEvent.change(fileInput(), { target: { files } });
}

async function click(element: HTMLElement) {
  fireEvent.click(element);
}

// The X in the corner is also named "Close", so tell the footer button apart.
function footerClose() {
  return within(
    screen.getByRole("dialog").querySelector('[data-slot="dialog-footer"]') as HTMLElement,
  ).getByRole("button", { name: "Close" });
}

async function next() {
  await click(screen.getByRole("button", { name: "Next" }));
}

async function goToReview(...files: File[]) {
  await pick(...files);
  await next();
  await click(await screen.findByRole("radio", { name: /Alice Tan/ }));
  await next();
  await screen.findByText("Is the call recorded?");
  await next();
}

beforeEach(() => {
  mockChecklist.mockReset();
  mockPresign.mockReset();
  mockPut.mockReset();
  mockAdvisors.mockReset();
  mockChecklist.mockResolvedValue([{ id: "K01", question: "Is the call recorded?" }]);
  mockAdvisors.mockResolvedValue([advisor]);
  mockPresign.mockImplementation(async (files) => ({
    uploads: [
      {
        id: "id",
        fileName: files[0].fileName,
        objectKey: `k/${files[0].fileName}`,
        presignedUrl: `https://s3.example/${files[0].fileName}`,
        expiresIn: 900,
      },
    ],
  }));
});

describe("UploadDialog file step", () => {
  it("lists picked files, ignores duplicates and keeps valid files beside invalid ones", async () => {
    renderDialog();
    await pick(mp3("a.mp3"), mp3("b.mp3"));
    expect(screen.getByText(/a\.mp3/)).toBeInTheDocument();
    expect(screen.getByText(/b\.mp3/)).toBeInTheDocument();

    await pick(mp3("a.mp3"));
    expect(screen.getAllByText(/a\.mp3/)).toHaveLength(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    await pick(new File(["x"], "notes.txt", { type: "text/plain" }), mp3("c.mp3"));
    expect(screen.getByRole("alert")).toHaveTextContent("text/plain");
    expect(screen.getByText(/c\.mp3/)).toBeInTheDocument();
  });

  it("rejects files beyond the cap and lets a file be removed", async () => {
    renderDialog();
    await pick(...["a", "b", "c", "d", "e"].map((n) => mp3(`${n}.mp3`)));
    await pick(mp3("f.mp3"));
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Only 5 files can be uploaded at once; 'f.mp3' was not added.",
    );
    expect(screen.queryByText(/f\.mp3 \(/)).not.toBeInTheDocument();

    await click(screen.getByRole("button", { name: "Remove a.mp3" }));
    expect(screen.queryByText(/a\.mp3 \(/)).not.toBeInTheDocument();
  });
});

describe("UploadDialog review step", () => {
  it("explains tonight's processing after the question list", async () => {
    renderDialog();
    await goToReview(mp3("a.mp3"));
    const question = await screen.findByText("Is the call recorded?");
    const note = screen.getByRole("note");
    expect(question.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(note).toHaveTextContent(
      "Tonight: processed at 8pm SGT on weekdays. The audio is deleted after processing, so playback won't be available.",
    );
  });

  it("uploads with the mode of the button pressed", async () => {
    mockPut.mockResolvedValue(undefined);
    renderDialog();
    await goToReview(mp3("a.mp3"));
    await click(screen.getByRole("button", { name: "Upload, process tonight" }));

    await screen.findByText("1 of 1 uploaded");
    expect(mockPresign).toHaveBeenCalledWith(expect.any(Array), "batch");
  });
});

describe("UploadDialog upload", () => {
  it("uploads every file and stays open until Close", async () => {
    mockPut.mockResolvedValue(undefined);
    const { onOpenChange, onUploaded } = renderDialog();
    await goToReview(mp3("a.mp3"), mp3("b.mp3"));
    await click(screen.getByRole("button", { name: "Upload and process now" }));

    expect(await screen.findByText("2 of 2 uploaded")).toBeInTheDocument();
    expect(screen.getAllByText("Uploaded")).toHaveLength(2);
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();

    await click(footerClose());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("cannot be closed while a PUT is pending", async () => {
    let finish: () => void = () => {};
    mockPut.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { onOpenChange } = renderDialog();
    await goToReview(mp3("a.mp3"));
    await click(screen.getByRole("button", { name: "Upload and process now" }));
    await screen.findByText(/Uploading \d+%/);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();

    await act(async () => finish());
    await screen.findByText("1 of 1 uploaded");
    expect(screen.getAllByRole("button", { name: "Close" })).toHaveLength(2);
  });

  it("offers Retry for a failed file", async () => {
    mockPut.mockImplementation(async (url) => {
      if (url.endsWith("b.mp3") && mockPut.mock.calls.length <= 2) throw new Error("boom");
    });
    const { onUploaded } = renderDialog();
    await goToReview(mp3("a.mp3"), mp3("b.mp3"));
    await click(screen.getByRole("button", { name: "Upload and process now" }));

    expect(await screen.findByText("Failed: boom")).toBeInTheDocument();
    expect(screen.getByText("1 of 2 uploaded")).toBeInTheDocument();

    await click(screen.getByRole("button", { name: "Retry b.mp3" }));
    await waitFor(() => expect(screen.getByText("2 of 2 uploaded")).toBeInTheDocument());
    expect(mockPut).toHaveBeenCalledTimes(3);
    expect(onUploaded).toHaveBeenCalledTimes(2);
  });
});
