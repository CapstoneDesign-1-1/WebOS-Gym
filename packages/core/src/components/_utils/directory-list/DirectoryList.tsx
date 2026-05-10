import { DragEventHandler, KeyboardEventHandler, MouseEventHandler, ReactElement, useEffect, useRef, useState } from "react";
import styles from "./DirectoryList.module.css";
import { ImagePreview } from "./ImagePreview";
import { VirtualFile } from "../../../features/virtual-drive/file";
import { VirtualFolder } from "../../../features/virtual-drive/folder";
import { Interactable } from "../interactable/Interactable";
import { useClassNames } from "../../../hooks/_utils/classNames";
import { removeFromArray, Vector2 } from "@prozilla-os/shared";
import { VirtualBase } from "../../../features/virtual-drive/virtualBase";

export interface OnSelectionChangeParams {
	/** The selected files. */
	files?: string[];
	/** The selected folders. */
	folders?: string[];
	/** The directory the selection was made in. */
	directory?: VirtualFolder;
};

export type FileEventHandler = (event: Event, file: VirtualFile) => void;
export type FolderEventHandler = (event: Event, folder: VirtualFolder) => void;

export interface DirectoryListProps {
	/** The directory to display. */
	directory: VirtualFolder;
	/** Whether to show hidden files and folders. */
	showHidden?: boolean;
	/** `className` prop for folders. */
	folderClassName?: string;
	/** `className` prop for files. */
	fileClassName?: string;
	/** `className` prop for this component. */
	className?: string;
	/** Function that handles context menu interactions on files. */
	onContextMenuFile?: FileEventHandler;
	/** Function that handles context menu interactions on folders. */
	onContextMenuFolder?: FolderEventHandler;
	/** Function that handles file opening events. */
	onOpenFile?: FileEventHandler;
	/** Function that handles folder opening events. */
	onOpenFolder?: FolderEventHandler;
	/** Whether to allow multiple files and folders to be selected at the same time. */
	allowMultiSelect?: boolean;
	/** Function that handles selection changes. */
	onSelectionChange?: (params: OnSelectionChangeParams) => void;
	/** File ID to start inline rename mode for. */
	renameFileId?: string | null;
	/** Folder ID to start inline rename mode for. */
	renameFolderId?: string | null;
	/** Callback for confirming a file rename. */
	onRenameFile?: (file: VirtualFile, nextName: string) => boolean | void;
	/** Callback for confirming a folder rename. */
	onRenameFolder?: (folder: VirtualFolder, nextName: string) => boolean | void;
	/** Callback when rename mode is closed. */
	onRenameEnd?: () => void;
	/** Callback for moving a file/folder into a destination folder via drag and drop. */
	onMoveItemToFolder?: (item: VirtualFile | VirtualFolder, destination: VirtualFolder) => void;
	/** Callback for moving an item path into a destination folder via drag and drop. */
	onMoveItemPathToFolder?: (itemPath: string, destination: VirtualFolder) => void;
	[key: string]: unknown;
}

/**
 * Component that displays the contents of a directory.
 */
export function DirectoryList({ directory, showHidden = false, folderClassName, fileClassName, className,
	onContextMenuFile, onContextMenuFolder, onOpenFile, onOpenFolder, allowMultiSelect = true, onSelectionChange,
	renameFileId = null, renameFolderId = null, onRenameFile, onRenameFolder, onRenameEnd, onMoveItemToFolder, onMoveItemPathToFolder, ...props }: DirectoryListProps): ReactElement | null {
	const [folders, setFolders] = useState<VirtualFolder[]>([]);
	const [files, setFiles] = useState<VirtualFile[]>([]);
	const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
	const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

	const ref = useRef<HTMLDivElement>(null);
	const renameInputRef = useRef<HTMLInputElement>(null);
	const [rectSelectStart, setRectSelectStart] = useState<Vector2 | null>(null);
	const [rectSelectEnd, setRectSelectEnd] = useState<Vector2 | null>(null);
	const [editingFileId, setEditingFileId] = useState<string | null>(null);
	const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
	const [editingValue, setEditingValue] = useState("");
	const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
	const [draggedFolderId, setDraggedFolderId] = useState<string | null>(null);

	useEffect(() => {
		onSelectionChange?.({ files: selectedFiles, folders: selectedFolders, directory });
	}, [directory, onSelectionChange, selectedFiles, selectedFolders]);

	const clearSelection = () => {
		setSelectedFolders([]);
		setSelectedFiles([]);
	};
	
	useEffect(() => {
		clearSelection();
	}, [directory]);

	useEffect(() => {
		if (renameFileId == null)
			return;

		const file = files.find((item) => item.id === renameFileId);
		if (file == null)
			return;

		setEditingFolderId(null);
		setEditingFileId(file.id);
		setEditingValue(file.id);
	}, [files, renameFileId]);

	useEffect(() => {
		if (renameFolderId == null)
			return;

		const folder = folders.find((item) => item.id === renameFolderId);
		if (folder == null)
			return;

		setEditingFileId(null);
		setEditingFolderId(folder.id);
		setEditingValue(folder.name);
	}, [folders, renameFolderId]);

	useEffect(() => {
		if (editingFileId != null || editingFolderId != null)
			renameInputRef.current?.focus();
	}, [editingFileId, editingFolderId]);

	useEffect(() => {
		const onMoveRectSelect = (event: MouseEvent) => {
			if (rectSelectStart == null)
				return;
	
			event.preventDefault();
			setRectSelectEnd({ x: event.clientX, y: event.clientY } as Vector2);
		};
		const onStopRectSelect = (event: MouseEvent) => {
			if (rectSelectStart == null || rectSelectEnd == null) {
				setRectSelectStart(null);
				setRectSelectEnd(null);
				return;
			}
	
			event.preventDefault();
			setRectSelectStart(null);
			setRectSelectEnd(null);
		};

		document.addEventListener("mousemove", onMoveRectSelect);
		document.addEventListener("mouseup", onStopRectSelect);

		return () => {
			document.removeEventListener("mousemove", onMoveRectSelect);
			document.removeEventListener("mouseup", onStopRectSelect);
		};
	});

	useEffect(() => {
		const onUpdate = () => {
			setFolders([...directory.getSubFolders(showHidden)]);
			setFiles([...directory.getFiles(showHidden)]);

			setSelectedFolders((folders) => folders.filter((folder) => directory.hasFolder(folder)));
			setSelectedFiles((files) => files.filter((file) => {
				const { name, extension } = VirtualFile.splitId(file);
				return directory.hasFile(name, extension as string | undefined);
			}));
		};

		onUpdate();
		directory.on(VirtualBase.UPDATE_EVENT, onUpdate);

		return () => {
			directory.off(VirtualBase.UPDATE_EVENT, onUpdate);
		};
	}, [directory, showHidden]);

	const selectFolder = (folder: VirtualFolder, exclusive = false) => {
		if (!allowMultiSelect)
			exclusive = true;
		setSelectedFolders(exclusive ? [folder.id] : [...selectedFolders, folder.id]);
		if (exclusive)
			setSelectedFiles([]);
	};

	const selectFile = (file: VirtualFile, exclusive = false) => {
		if (!allowMultiSelect)
			exclusive = true;
		setSelectedFiles(exclusive ? [file.id] : [...selectedFiles, file.id]);
		if (exclusive)
			setSelectedFolders([]);
	};

	const deselectFolder = (folder: VirtualFolder) => {
		const newFolders = [...selectedFolders];
		removeFromArray(folder.id, newFolders);
		setSelectedFolders(newFolders);
	};

	const deselectFile = (file: VirtualFile) => {
		const newFiles = [...selectedFiles];
		removeFromArray(file.id, newFiles);
		setSelectedFiles(newFiles);
	};

	const onStartRectSelect = (event: MouseEvent) => {
		const target = event.target as HTMLElement | null;
		if (target?.closest("button") != null)
			return;

		event.preventDefault();
		setRectSelectStart({ x: event.clientX, y: event.clientY } as Vector2);
	};

	const getRectSelectStyle = () => {
		let x: number, y: number, width: number, height: number = 0;

		if (ref.current == null || rectSelectStart == null || rectSelectEnd == null)
			return { top: 0, left: 0, width: 0, height: 0 };

		const containerRect = ref.current.getBoundingClientRect();

		if (rectSelectStart.x < rectSelectEnd.x) {
			x = rectSelectStart.x;
			width = rectSelectEnd.x - rectSelectStart.x;
		} else {
			x = rectSelectEnd.x;
			width = rectSelectStart.x - rectSelectEnd.x;
		}
		if (rectSelectStart.y < rectSelectEnd.y) {
			y = rectSelectStart.y;
			height = rectSelectEnd.y - rectSelectStart.y;
		} else {
			y = rectSelectEnd.y;
			height = rectSelectStart.y - rectSelectEnd.y;
		}

		x -= containerRect.x;
		y -= containerRect.y;
		

		return { top: y, left: x, width, height };
	};

	const endRename = () => {
		setEditingFileId(null);
		setEditingFolderId(null);
		setEditingValue("");
		onRenameEnd?.();
	};

	const confirmFileRename = (file: VirtualFile) => {
		const nextName = editingValue.trim();
		if (nextName.length === 0) {
			endRename();
			return;
		}

		const result = onRenameFile?.(file, nextName);
		if (result === false) {
			endRename();
			return;
		}

		endRename();
	};

	const confirmFolderRename = (folder: VirtualFolder) => {
		const nextName = editingValue.trim();
		if (nextName.length === 0) {
			endRename();
			return;
		}

		const result = onRenameFolder?.(folder, nextName);
		if (result === false) {
			endRename();
			return;
		}

		endRename();
	};

	const onRenameKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
		if (event.key === "Escape")
			endRename();
	};

	const onDragOverFolder: DragEventHandler = (event) => {
		event.preventDefault();
	};

	const onDropOnFolder = (event: DragEvent, folder: VirtualFolder) => {
		const payload = event.dataTransfer?.getData("application/x-prozilla-item");
		if (payload != null && payload.length > 0) {
			try {
				const parsed = JSON.parse(payload) as { path?: string };
				if (parsed.path != null && parsed.path.length > 0) {
					onMoveItemPathToFolder?.(parsed.path, folder);
					setDraggedFileId(null);
					setDraggedFolderId(null);
					return;
				}
			} catch {
				// Ignore malformed payload and fallback to in-list drag state.
			}
		}

		if (draggedFileId == null && draggedFolderId == null)
			return;

		const draggedFile = draggedFileId == null ? null : files.find((file) => file.id === draggedFileId) ?? null;
		const draggedFolder = draggedFolderId == null ? null : folders.find((item) => item.id === draggedFolderId) ?? null;
		const draggedItem = draggedFile ?? draggedFolder;

		if (draggedItem != null)
			onMoveItemToFolder?.(draggedItem, folder);

		setDraggedFileId(null);
		setDraggedFolderId(null);
	};

	const classNames = [styles.DirectoryList];
	const folderClassNames = [styles.FolderButton];
	const fileClassNames = [styles.FileButton];

	if (className)
		classNames.push(className);
	if (folderClassName)
		folderClassNames.push(folderClassName);
	if (fileClassName)
		fileClassNames.push(fileClassName);

	folderClassName = useClassNames(folderClassNames, "DirectoryList", "Folder");
	fileClassName = useClassNames(fileClassNames, "DirectoryList", "File");

	return <div
		ref={ref}
		className={useClassNames(classNames, "DirectoryList")}
		onClick={clearSelection}
		onMouseDown={onStartRectSelect as unknown as MouseEventHandler}
		{...props}
	>
		{rectSelectStart != null && rectSelectEnd != null
			? <div className={styles.SelectionRect} style={getRectSelectStyle()}/>
			: null
		}
		{folders.map((folder) => 
			<Interactable
				key={folder.id}
				draggable
				tabIndex={0}
				className={folderClassName}
				data-selected={selectedFolders.includes(folder.id)}
				onContextMenu={(event: MouseEvent) => {
					onContextMenuFolder?.(event, folder);
				}}
				onClick={(event: MouseEvent) => {
					selectFolder(folder, !event.ctrlKey);
				}}
				onDoubleClick={(event: MouseEvent) => {
					onOpenFolder?.(event, folder);
					deselectFolder(folder);
				}}
				onDragStart={() => {
					setDraggedFileId(null);
					setDraggedFolderId(folder.id);
				}}
				onDragStartCapture={(event: DragEvent) => {
					event.dataTransfer?.setData("application/x-prozilla-item", JSON.stringify({ path: folder.absolutePath }));
				}}
				onDragOver={onDragOverFolder}
				onDrop={(event: DragEvent) => {
					event.preventDefault();
					onDropOnFolder(event, folder);
				}}
			>
				<div className={styles.FolderIcon}>
					<ImagePreview source={folder.getIconUrl()} onError={() => { folder.setIconUrl(null); }}/>
				</div>
				{editingFolderId === folder.id
					? <input
						ref={renameInputRef}
						value={editingValue}
						onClick={(event) => { event.stopPropagation(); }}
						onChange={(event) => { setEditingValue(event.target.value); }}
						onBlur={() => { confirmFolderRename(folder); }}
						onKeyDown={(event) => {
							onRenameKeyDown(event);
							if (event.key === "Enter") {
								event.preventDefault();
								confirmFolderRename(folder);
							}
						}}
					/>
					: <p>{folder.name}</p>
				}
			</Interactable>
		)}
		{files.map((file) => 
			<Interactable
				key={file.id}
				draggable
				tabIndex={0}
				className={fileClassName}
				data-selected={selectedFiles.includes(file.id)}
				onContextMenu={(event: MouseEvent) => {
					onContextMenuFile?.(event, file);
				}}
				onClick={(event: MouseEvent) => {
					selectFile(file, !event.ctrlKey);
				}}
				onDoubleClick={(event: MouseEvent) => {
					onOpenFile?.(event, file);
					deselectFile(file);
				}}
				onDragStart={() => {
					setDraggedFolderId(null);
					setDraggedFileId(file.id);
				}}
				onDragStartCapture={(event: DragEvent) => {
					event.dataTransfer?.setData("application/x-prozilla-item", JSON.stringify({ path: file.absolutePath }));
				}}
			>
				<div className={styles.FileIcon}>
					<ImagePreview source={file.getIconUrl()} onError={() => { file.setIconUrl(null); }}/>
				</div>
				{editingFileId === file.id
					? <input
						ref={renameInputRef}
						value={editingValue}
						onClick={(event) => { event.stopPropagation(); }}
						onChange={(event) => { setEditingValue(event.target.value); }}
						onBlur={() => { confirmFileRename(file); }}
						onKeyDown={(event) => {
							onRenameKeyDown(event);
							if (event.key === "Enter") {
								event.preventDefault();
								confirmFileRename(file);
							}
						}}
					/>
					: <p>{file.id}</p>
				}
			</Interactable>
		)}
	</div>;
}
