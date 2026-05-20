"use client";

import {
  MDXEditor,
  BlockTypeSelect,
  BoldItalicUnderlineToggles,
  CodeToggle,
  CreateLink,
  InsertTable,
  ListsToggle,
  Separator,
  headingsPlugin,
  linkPlugin,
  listsPlugin,
  markdownShortcutPlugin,
  quotePlugin,
  tablePlugin,
  toolbarPlugin,
  thematicBreakPlugin,
} from "@mdxeditor/editor";

export function MdxMarkdownEditor({
  markdown,
  onChange,
}: {
  markdown: string;
  onChange: (markdown: string) => void;
}) {
  return (
    <MDXEditor
      className="skillfully-mdx-editor h-full"
      contentEditableClassName="skillfully-mdx-content"
      markdown={markdown}
      onChange={onChange}
      plugins={[
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <BlockTypeSelect />
              <Separator />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <Separator />
              <ListsToggle />
              <CreateLink />
              <InsertTable />
            </>
          ),
        }),
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        tablePlugin(),
        markdownShortcutPlugin(),
      ]}
    />
  );
}
