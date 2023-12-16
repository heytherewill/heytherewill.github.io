[<AutoOpen>]
module Models

open System
open Markdig.Syntax

type MarkdownFile =
    { Title: string
      Path: string
      Emoji: string
      Document: MarkdownDocument }

type String with

    static member join (separator: string) (stringList: string seq) = String.Join(separator, stringList)

type Node =
    | Folder of String * Node list
    | File of MarkdownFile

type Info =
    { Title: string
      Emoji: string }

    static member FromMetadata(metadata: string seq) =

        let extractValueForKey (key: string) =
            let searchKey = key + ": "
            let keyLength = searchKey.Length

            metadata
            |> Seq.filter (fun x -> x.StartsWith(searchKey))
            |> Seq.map (fun x -> x.Substring(keyLength, x.Length - keyLength))
            |> Seq.tryExactlyOne

        { Title = extractValueForKey "title" |> Option.defaultValue ""
          Emoji = extractValueForKey "emoji" |> Option.defaultValue "👋🏽" }

let fileOrNone node =
    match node with
    | Folder _ -> None
    | File f -> Some f

let nodePath node =
    match node with
    | Folder(path, _) -> path
    | File markdownFile -> markdownFile.Path

let nodeName node =
    match node with
    | Folder(path, children) ->
        (children |> Seq.choose fileOrNone |> Seq.tryFind (fun f -> f.Path = path))
        |> Option.map (fun n -> n.Title)
        |> Option.defaultValue "Home"
    | File markdownFile -> markdownFile.Title
