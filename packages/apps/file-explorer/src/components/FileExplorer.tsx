import { ChangeEventHandler, FC, KeyboardEventHandler, MouseEvent as ReactMouseEvent, useCallback, useEffect, useState } from "react";
import styles from "./FileExplorer.module.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowUp, faCaretLeft, faCaretRight, faCircleInfo, faCog, faDesktop, faFileLines, faHouse, faImage, faPlus, faSearch, faTrash, faUpload } from "@fortawesome/free-solid-svg-icons";
import { QuickAccessButton } from "./QuickAccessButton";
import { ImportButton } from "./ImportButton";
import { Actions, ClickAction, CODE_EXTENSIONS, DialogBox, DirectoryList, Divider, FileEventHandler, FolderEventHandler, ModalProps, ModalsConfig, OnSelectionChangeParams, useAlert, useContextMenu, useHistory, useSystemManager, useVirtualRoot, useWindowedModal, useWindowsManager, utilStyles, VirtualFile, VirtualFolder, VirtualFolderLink, VirtualRoot, WindowProps } from "@prozilla-os/core";
import { SELECTOR_MODE } from "../constants/fileExplorer.const";
import { FileProperties } from "./modals/file-properties/FileProperties";
import { JSX } from "react/jsx-runtime";
import { Vector2 } from "@prozilla-os/shared";

export interface FileExplorerProps extends WindowProps {
	path?: string;
	selectorMode?: number;
	Footer?: FC;
	onSelectionChange?: (params: OnSelectionChangeParams) => void;
	onSelectionFinish?: () => void;
}

export function FileExplorer({ app, path: startPath, selectorMode, Footer, onSelectionChange, onSelectionFinish }: FileExplorerProps) {
	const isSelector = Footer != null && selectorMode != null && selectorMode !== SELECTOR_MODE.NONE;

	const virtualRoot = useVirtualRoot();
	const windowsManager = useWindowsManager();
	const { windowsConfig } = useSystemManager();

	const [currentDirectory, setCurrentDirectory] = useState<VirtualFolder | null>(virtualRoot ? virtualRoot.navigateToFolder(startPath ?? "~") : null);
	const [path, setPath] = useState<string>(currentDirectory?.path ?? "");
	const [renameFileId, setRenameFileId] = useState<string | null>(null);
	const [renameFolderId, setRenameFolderId] = useState<string | null>(null);
	const [cutItem, setCutItem] = useState<VirtualFile | VirtualFolder | null>(null);
	const [showHidden] = useState(true);
	const { history, stateIndex, pushState, undo, redo, undoAvailable, redoAvailable } = useHistory<string>(currentDirectory?.path ?? "");
	const { alert } = useAlert();

	const { openWindowedModal } = useWindowedModal();

	const showRenameError = useCallback((message: string) => {
		openWindowedModal({
			title: "Rename Error",
			iconUrl: app?.iconUrl as string | undefined,
			size: new Vector2(360, 170),
			Modal: (props: JSX.IntrinsicAttributes & ModalProps) =>
				<DialogBox {...props}>
					<p>{message}</p>
					<button data-type={ModalsConfig.DIALOG_CONTENT_TYPES.closeButton}>Ok</button>
				</DialogBox>,
		});
	}, [app?.iconUrl, openWindowedModal]);

	const moveItemToDirectory = useCallback((item: VirtualFile | VirtualFolder, destination: VirtualFolder) => {
		if (!destination.canBeEdited) {
			showRenameError("This destination folder is protected.");
			return false;
		}

		if (!item.canBeEdited) {
			showRenameError("This item cannot be moved.");
			return false;
		}

		if (item.isFolder()) {
			let current: VirtualFolder | null | undefined = destination;
			while (current != null) {
				if (current === item) {
					showRenameError("Cannot move a folder inside itself.");
					return false;
				}
				current = current.parent;
			}
		}

		if (item.isFile()) {
			const conflictFile = destination.findFile(item.name, item.extension);
			const conflictFolder = destination.findSubFolder(item.id);
			if (conflictFile != null && conflictFile !== item || conflictFolder != null) {
				showRenameError("A file or folder with this name already exists in destination.");
				return false;
			}
		} else {
			const conflictFolder = destination.findSubFolder(item.name);
			const conflictFile = destination.findFile(item.name);
			if (conflictFolder != null && conflictFolder !== item || conflictFile != null) {
				showRenameError("A file or folder with this name already exists in destination.");
				return false;
			}
		}

		if (item.parent == null)
			return false;

		if (item.parent === destination)
			return true;

		item.parent.remove(item);
		if (item.isFile()) {
			destination.addFile(item, false);
		} else {
			destination.addFolder(item, false);
		}
		item.parent = destination;
		item.confirmChanges();
		destination.confirmChanges();
		return true;
	}, [showRenameError]);
	const { onContextMenu: onContextMenuFile } = useContextMenu({ Actions: (props) =>
		<Actions {...props}>
			<ClickAction label={!isSelector ? "Open" : "Select"} onTrigger={(_event, file) => {
				if (isSelector) {
					onSelectionChange?.({ files: [(file as VirtualFile).id], directory: currentDirectory! });
					onSelectionFinish?.();
					return;
				}
				if (windowsManager != null)	(file as VirtualFile).open(windowsManager);
			}}/>
			{(props.triggerParams as VirtualFile).isDownloadable() && 
				<ClickAction label="Export" icon={faUpload} onTrigger={(_event, file) => {
					(file as VirtualFile).download();
				}}/>
			}			
			<ClickAction label="Rename" onTrigger={(_event, file) => {
				setRenameFolderId(null);
				setRenameFileId((file as VirtualFile).id);
			}}/>
			<ClickAction label="Cut" onTrigger={(_event, file) => {
				setCutItem(file as VirtualFile);
			}}/>
			<ClickAction label="Delete" icon={faTrash} onTrigger={(_event, file) => {
				(file as VirtualFile).delete();
			}}/>
			<ClickAction label="Properties" icon={faCircleInfo} onTrigger={(_event, file) => {
				openWindowedModal({
					title: `${(file as VirtualFile).id} ${windowsConfig.titleSeparator} Properties`,
					iconUrl: (file as VirtualFile).getIconUrl(),
					size: new Vector2(400, 500),
					Modal: (props: object) => <FileProperties file={file as VirtualFile} {...props}/>,
				});
			}}/>
		</Actions>,
	});
	const { onContextMenu: onContextMenuFolder } = useContextMenu({ Actions: (props) =>
		<Actions {...props}>
			<ClickAction label="Open" onTrigger={(_event, folder) => {
				changeDirectory((folder as VirtualFolderLink).linkedPath ?? (folder as VirtualFolder).name);
			}}/>
			{/* <ClickAction label={`Open in ${APP_NAMES.TERMINAL}`} icon={APP_ICONS.TERMINAL} onTrigger={(event, folder) => {
				windowsManager?.open(APPS.TERMINAL, { startPath: (folder as VirtualFolder).path });
			}}/> */}
			<Divider/>
			<ClickAction label="Rename" onTrigger={(_event, folder) => {
				setRenameFileId(null);
				setRenameFolderId((folder as VirtualFolder).id);
			}}/>
			<ClickAction label="Cut" onTrigger={(_event, folder) => {
				setCutItem(folder as VirtualFolder);
			}}/>
			{cutItem != null && <ClickAction label="Paste Into" onTrigger={(_event, folder) => {
				const success = moveItemToDirectory(cutItem, folder as VirtualFolder);
				if (success)
					setCutItem(null);
			}}/>}
			<ClickAction label="Delete" icon={faTrash} onTrigger={(_event, folder) => {
				(folder as VirtualFolder).delete();
			}}/>
		</Actions>,
	});
	// const { onContextMenu: onNew } = useContextMenu({
	// 	modalsManager,
	// 	options: {
	// 		"File": () => { currentDirectory.createFile("New File"); },
	// 		"Folder": () => { currentDirectory.createFolder("New Folder"); }
	// 	}
	// });

	const changeDirectory = useCallback((path: string, absolute = false) => {
		if (currentDirectory == null)
			absolute = true;

		const directory = absolute ? virtualRoot?.navigate(path) : currentDirectory?.navigate(path);

		if (directory != null) {
			setRenameFileId(null);
			setRenameFolderId(null);
			setCurrentDirectory(directory as VirtualFolder);
			setPath(directory.root ? "/" : directory.path);
			pushState(directory.path);
		}
	}, [currentDirectory, pushState, virtualRoot]);

	useEffect(() => {
		if (history.length === 0)
			return;

		const path = history[stateIndex];
		const directory = virtualRoot?.navigate(path);
		if (directory != null) {
			setCurrentDirectory(directory as VirtualFolder);
			setPath(directory.root ? "/" : directory.path);
		}
	}, [history, stateIndex, virtualRoot]);

	useEffect(() => {
		type Error = { message: string };
		const onError = (error: unknown) => {
			alert({
				title: (error as Error).message,
				text: "You have exceeded the virtual drive capacity. Files and folders will not be saved until more storage is freed.",
				iconUrl: app?.iconUrl as string | undefined,
				size: new Vector2(300, 200),
				single: true,
			});
		};

		virtualRoot?.on(VirtualRoot.ERROR_EVENT, onError);

		return () => {
			virtualRoot?.off(VirtualRoot.ERROR_EVENT, onError);
		};
	}, []);

	const onPathChange = (event: Event) => {
		setPath((event.target as HTMLInputElement).value);
	};

	const onKeyDown = (event: KeyboardEvent) => {
		let value = (event.target as HTMLInputElement).value;

		if (event.key === "Enter") {
			if (value === "")
				value = "~";

			const directory = virtualRoot?.navigate(value);

			if (directory == null) {
				openWindowedModal({
					title: "Error",
					iconUrl: app?.iconUrl as string | undefined,
					size: new Vector2(300, 150),
					Modal: (props: JSX.IntrinsicAttributes & ModalProps) =>
						<DialogBox {...props}>
							<p>Invalid path: "{value}"</p>
							<button data-type={ModalsConfig.DIALOG_CONTENT_TYPES.closeButton}>Ok</button>
						</DialogBox>,
				});
				return;
			} else if (directory.isFolder()) {
				setCurrentDirectory(directory);
				setPath(directory.root ? "/" : directory.path);
			}
		}
	};

	const itemCount = currentDirectory?.getItemCount(showHidden) ?? 0;

	const getUniqueFolderName = useCallback((baseName: string) => {
		if (currentDirectory == null)
			return baseName;

		if (!currentDirectory.hasFolder(baseName))
			return baseName;

		let index = 2;
		let candidate = `${baseName} (${index})`;
		while (currentDirectory.hasFolder(candidate)) {
			index += 1;
			candidate = `${baseName} (${index})`;
		}

		return candidate;
	}, [currentDirectory]);

	const getUniqueFileName = useCallback((baseName: string, extension?: string) => {
		if (currentDirectory == null)
			return { name: baseName, extension };

		if (!currentDirectory.hasFile(baseName, extension))
			return { name: baseName, extension };

		let index = 2;
		let candidate = `${baseName} (${index})`;
		while (currentDirectory.hasFile(candidate, extension)) {
			index += 1;
			candidate = `${baseName} (${index})`;
		}

		return { name: candidate, extension };
	}, [currentDirectory]);

	const createNewFile = useCallback(() => {
		if (currentDirectory == null || !currentDirectory.canBeEdited)
			return;

		const { name, extension } = getUniqueFileName("New File", "txt");
		currentDirectory.createFile(name, extension);
	}, [currentDirectory, getUniqueFileName]);

	const createNewFolder = useCallback(() => {
		if (currentDirectory == null || !currentDirectory.canBeEdited)
			return;

		const folderName = getUniqueFolderName("New Folder");
		currentDirectory.createFolder(folderName);
	}, [currentDirectory, getUniqueFolderName]);

	const { onContextMenu: onContextMenuDirectory } = useContextMenu({ Actions: (props) =>
		<Actions {...props}>
			<ClickAction label="New File" icon={faPlus} onTrigger={() => {
				createNewFile();
			}}/>
			<ClickAction label="New Folder" icon={faPlus} onTrigger={() => {
				createNewFolder();
			}}/>
			{cutItem != null && <>
				<Divider/>
				<ClickAction label="Paste" onTrigger={() => {
					if (currentDirectory == null)
						return;
					const success = moveItemToDirectory(cutItem, currentDirectory);
					if (success)
						setCutItem(null);
				}}/>
			</>}
		</Actions>,
	});

	return (
		<div className={!isSelector ? styles.FileExplorer : `${styles.FileExplorer} ${styles.Selector}`}>
			<div className={styles.Header}>
				<button
					title="Back"
					tabIndex={0}
					className={styles.IconButton}
					onClick={() => { undo(); }}
					disabled={!undoAvailable}
				>
					<FontAwesomeIcon icon={faCaretLeft}/>
				</button>
				<button
					title="Forward"
					tabIndex={0}
					className={styles.IconButton}
					onClick={() => { redo(); }}
					disabled={!redoAvailable}
				>
					<FontAwesomeIcon icon={faCaretRight}/>
				</button>
				<button
					title="Up"
					tabIndex={0}
					className={styles.IconButton}
					onClick={() => { changeDirectory(".."); }}
					disabled={currentDirectory?.isRoot != null && currentDirectory.isRoot}
				>
					<FontAwesomeIcon icon={faArrowUp}/>
				</button>
				<button
					title="New"
					tabIndex={0}
					className={styles.IconButton}
					onClick={() => {
						if (!currentDirectory?.canBeEdited) {
							openWindowedModal({
								title: "Error",
								iconUrl: app?.iconUrl as string | undefined,
								size: new Vector2(300, 150),
								Modal: (props: JSX.IntrinsicAttributes & ModalProps) =>
									<DialogBox {...props}>
										<p>This folder is protected.</p>
										<button data-type={ModalsConfig.DIALOG_CONTENT_TYPES.closeButton}>Ok</button>
									</DialogBox>,
							});
							return;
						}

						openWindowedModal({
							title: "Create New",
							iconUrl: app?.iconUrl as string | undefined,
							size: new Vector2(320, 170),
							Modal: (props: JSX.IntrinsicAttributes & ModalProps) =>
								<DialogBox {...props}>
									<p>Create an item in this folder.</p>
									<button onClick={createNewFile}>New File</button>
									<button onClick={createNewFolder}>New Folder</button>
									<button data-type={ModalsConfig.DIALOG_CONTENT_TYPES.closeButton}>Close</button>
								</DialogBox>,
						});
					}}
					disabled={!currentDirectory?.canBeEdited}
				>
					<FontAwesomeIcon icon={faPlus}/>
				</button>
				<input
					value={path}
					type="text"
					aria-label="Path"
					className={styles.PathInput}
					tabIndex={0}
					onChange={onPathChange as unknown as ChangeEventHandler}
					onKeyDown={onKeyDown as unknown as KeyboardEventHandler}
					placeholder="Enter a path..."
				/>
				<ImportButton directory={currentDirectory!}/>
				<button title="Search" tabIndex={0} className={styles.IconButton}>
					<FontAwesomeIcon icon={faSearch}/>
				</button>
				<button title="Settings" tabIndex={0} className={styles.IconButton}>
					<FontAwesomeIcon icon={faCog}/>
				</button>
			</div>
			<div className={styles.Body}>
				<div className={styles.Sidebar}>
					<QuickAccessButton name={"Home"} onClick={() => { changeDirectory("~"); }} icon={faHouse}/>
					<QuickAccessButton name={"Desktop"} onClick={() => { changeDirectory("~/Desktop"); }} icon={faDesktop}/>
					<QuickAccessButton name={"Images"} onClick={() => { changeDirectory("~/Pictures"); }} icon={faImage}/>
					<QuickAccessButton name={"Documents"} onClick={() => { changeDirectory("~/Documents"); }} icon={faFileLines}/>
				</div>
				<DirectoryList
					directory={currentDirectory!} 
					id="main"
					className={styles.Main}
					showHidden={showHidden}
					onContextMenu={(event: ReactMouseEvent) => {
						event.preventDefault();
						onContextMenuDirectory(event as unknown as Parameters<typeof onContextMenuDirectory>[0]);
					}}
					onOpenFile={(event, file) => {
						event.preventDefault();
						if (isSelector)
							return void onSelectionFinish?.();
						const options: Record<string, string> = {};
						if (file.extension === "md" || file.extension != null && CODE_EXTENSIONS.includes(file.extension))
							options.mode = "view";
						windowsManager?.openFile(file, options);
					}}
					onOpenFolder={(_event, folder) => {
						changeDirectory((folder as VirtualFolderLink).linkedPath ?? folder.name);
					}}
					onMoveItemToFolder={(item, folder) => {
						const success = moveItemToDirectory(item, folder);
						if (success && cutItem === item)
							setCutItem(null);
					}}
					onMoveItemPathToFolder={(itemPath, folder) => {
						const item = virtualRoot?.navigate(itemPath);
						if (item == null || !item.isFile() && !item.isFolder())
							return;

						const success = moveItemToDirectory(item, folder);
						if (success && cutItem != null && cutItem.absolutePath === item.absolutePath)
							setCutItem(null);
					}}
					onContextMenuFile={onContextMenuFile as unknown as FileEventHandler}
					onContextMenuFolder={onContextMenuFolder as unknown as FolderEventHandler}
					allowMultiSelect={selectorMode !== SELECTOR_MODE.SINGLE}
					renameFileId={renameFileId}
					renameFolderId={renameFolderId}
					onRenameFile={(file, nextId) => {
						if (currentDirectory == null || !currentDirectory.canBeEdited)
							return false;

						const { name, extension } = VirtualFile.splitId(nextId);
						if (name.trim().length === 0)
							return false;

						const exists = currentDirectory.findFile(name, extension);
						if (exists != null && exists !== file) {
							showRenameError("A file with this name already exists in this folder.");
							return false;
						}

						file.setName(name);
						file.extension = extension;
						file.confirmChanges();
						return true;
					}}
					onRenameFolder={(folder, nextName) => {
						if (currentDirectory == null || !currentDirectory.canBeEdited)
							return false;

						const trimmed = nextName.trim();
						if (trimmed.length === 0)
							return false;

						const exists = currentDirectory.findSubFolder(trimmed);
						if (exists != null && exists !== folder) {
							showRenameError("A folder with this name already exists in this folder.");
							return false;
						}

						folder.setName(trimmed);
						return true;
					}}
					onRenameEnd={() => {
						setRenameFileId(null);
						setRenameFolderId(null);
					}}
					onSelectionChange={onSelectionChange}
				/>
			</div>
			{!isSelector
				? <span className={styles.Footer}>
					<p className={utilStyles.TextLight}>
						{itemCount === 1
							? itemCount + " item"
							: itemCount + " items"
						}
					</p>
				</span>
				: <div className={styles.Footer}>
					<Footer/>
				</div>
			}
		</div>
	);
}
