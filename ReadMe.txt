# TON Web
This is first project of my (@dkaraush) submission.

More detailed page of project: https://tonweb.site

This repository contains scripts for hosting files in TON Blockchain and proxy, which makes possible to request websites in blockchain through browser.

# Why?
Because I can!

Well, basically, I just thought: what if I shouldn't pay to centralized host server to have own website and try to upload websites to the TON. I have faced some limitations, the main of them is external message size limit (64KB), when I wanted to send too huge files.

I know, that it is a stupid idea, and it is senseless to "make own Facebook in blockchain". However, why not? :D

# How to host a website in TON Web?
You need a *nix system.

1. Compile lite-client and fift, as described here.
Make sure, that FIFTPATH is configured and fift is available globally.

2. Download my repository.

3. Run bash new.sh /path/to/your/website/ <name-base-of-files>

For example, bash new.sh ~/tonweb.site tonweb
You should witness how files are being put in "bag-of-cells" file.
At the end, it will generate an external message and show you a price of website holding.

4. Transfer needed Grams to the address.

5. Send external message (`sendfile <filebase>-query.boc` in lite-client).