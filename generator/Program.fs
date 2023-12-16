open System
open System.IO

let args = Environment.GetCommandLineArgs()
let directoryToScan = args[1]
let outputDirectory = args[2]
let templateDirectory = args[3]
let includesDirectory = args[4]
let shouldWatch = args |> Seq.contains "--watch"

if not shouldWatch then
    generateFiles directoryToScan outputDirectory includesDirectory templateDirectory
    Console.WriteLine($"Files generated at   {outputDirectory}")
else
    let createWatcher (path, filter) =
        let watcher = new FileSystemWatcher()
        watcher.Path <- path
        watcher.Filter <- filter

        watcher.NotifyFilter <-
            NotifyFilters.LastAccess
            ||| NotifyFilters.LastWrite
            ||| NotifyFilters.FileName
            ||| NotifyFilters.DirectoryName

        watcher.IncludeSubdirectories <- true
        watcher.Changed.Add(fun _ -> generateFiles directoryToScan outputDirectory includesDirectory templateDirectory)
        watcher.Deleted.Add(fun _ -> generateFiles directoryToScan outputDirectory includesDirectory templateDirectory)
        watcher.Created.Add(fun _ -> generateFiles directoryToScan outputDirectory includesDirectory templateDirectory)
        watcher.Renamed.Add(fun _ -> generateFiles directoryToScan outputDirectory includesDirectory templateDirectory)
        watcher

    let watchers =
        [ (directoryToScan, "*.md")
          // (includesDirectory, "*.css")
          (templateDirectory, "*.html") ]
        |> Seq.map createWatcher

    for watcher in watchers do
        watcher.EnableRaisingEvents <- true

    Console.WriteLine($"Listening to changes in {outputDirectory}")
    Console.WriteLine($"Press any key to exit")
    Console.ReadKey() |> ignore
