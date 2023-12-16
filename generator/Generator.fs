[<AutoOpen>]
module Parser

open System
open Markdig
open Markdig.Extensions.Yaml
open Markdig.Syntax
open System.IO

let private pipeline = MarkdownPipelineBuilder().UseYamlFrontMatter().Build()

let private isDirectory (path: string) =
    (File.GetAttributes(path) &&& FileAttributes.Directory) = FileAttributes.Directory

let rec private scan (basePath: string) path =
    if isDirectory path then
        let children =
            Directory.EnumerateFileSystemEntries(path)
            |> Seq.filter (fun p -> not (p.EndsWith(".DS_Store", StringComparison.OrdinalIgnoreCase)))
            |> Seq.map (scan basePath)
            |> Seq.toList

        let fileInfo = FileInfo(path)
        let path = if fileInfo.Name = "" then "index" else fileInfo.Name
        Folder(path, children)
    else
        let fileInfo = FileInfo(path)
        let markdown = path |> File.ReadAllText
        let document = Markdown.Parse(markdown, pipeline)

        let info =
            document.Descendants<YamlFrontMatterBlock>()
            |> Seq.map (fun b -> markdown.Substring(b.Span.Start, b.Span.Length).Split(Environment.NewLine))
            |> Seq.head
            |> Info.FromMetadata

        let path =
            fileInfo.Name.Substring(0, fileInfo.Name.Length - fileInfo.Extension.Length)

        { Title = info.Title
          Document = document
          Path = path
          Emoji = info.Emoji }
        |> Node.File

let generateNavForNodes breadcrumbs currentPath nodeList =
    let linkForNode node =
        let path = nodePath node

        let cssClass =
            if path = currentPath then "page"
            else if Seq.contains path breadcrumbs then "italic"
            else ""

        $"<li> <a class=\"{cssClass}\" href=\"{path}.html\"> {(nodeName node)} </a> </li>"

    let links = nodeList |> Seq.map linkForNode |> String.join Environment.NewLine
    $"<ul>{links}</ul>"

let rec writeToDirectory
    (template: string)
    outputDirectory
    (node: Node)
    (grandParents: Node list)
    (parents: Node list)
    (siblings: Node list)
    (breadcrumbs: string list)
    =
    match node with
    | Folder(path, children) ->
        let nextLevelGrandparents = parents
        let nextLevelParents = siblings
        let nextLevelSiblings = children |> List.filter (fun n -> (nodePath n) <> path)

        for childNode in children do
            writeToDirectory
                template
                outputDirectory
                childNode
                nextLevelGrandparents
                nextLevelParents
                nextLevelSiblings
                (path :: breadcrumbs)

    | File markdownFile ->
        let outputPath = outputDirectory + markdownFile.Path + ".html"
        let outputDirectory = Path.GetDirectoryName(outputPath)
        let content = Markdown.ToHtml(markdownFile.Document, pipeline)

        let links =
            [ grandParents; parents; siblings ]
            |> Seq.filter (Seq.isEmpty >> not)
            |> Seq.map (generateNavForNodes breadcrumbs markdownFile.Path)
            |> String.join Environment.NewLine

        let finalHtml =
            template
                .Replace("{PAGE_EMOJI}", markdownFile.Emoji)
                .Replace("{PAGE_LINKS}", links)
                .Replace("{PAGE_TITLE}", markdownFile.Title)
                .Replace("{PAGE_CONTENT}", content)

        Directory.CreateDirectory(outputDirectory) |> ignore
        File.WriteAllText(outputPath, finalHtml)

let generateFiles directoryToScan outputDirectory includesDirectory templateDirectory =
    let template = File.ReadAllText(templateDirectory + "default.html")
    Console.WriteLine("Generating files")
    let node = scan directoryToScan directoryToScan
    writeToDirectory template outputDirectory node [] [] [] []

    for path in Directory.EnumerateFileSystemEntries(includesDirectory) do
        let fileInfo = FileInfo(path)
        File.Copy(path, outputDirectory + fileInfo.Name, true)

    Console.WriteLine("Files generated")
